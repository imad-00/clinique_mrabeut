"use client"

import { useEffect, useRef, useState } from "react"
import { DisplayShell } from "@/app/display/_components/DisplayShell"
import { VideoPlayer } from "@/app/display/_components/VideoPlayer"
import { CallingOverlay } from "@/app/display/_components/CallingOverlay"
import { useDisplayPolling } from "@/app/display/_hooks/useDisplayPolling"
import { BrandLogo } from "@/components/BrandLogo"
import { resolveApiUrl } from "@/src/lib/apiBase"

export default function DisplayPage() {
    const { data } = useDisplayPolling()

    const mode = data?.mode ?? "IDLE"
    const queueNumber = data?.queueNumber ?? null
    const patientName = data?.patientName ?? null
    const destination = data?.destination ?? null
    const lastPlayedUpdateRef = useRef<string | null>(null)
    const audioContextRef = useRef<AudioContext | null>(null)
    const notificationAudioRef = useRef<HTMLAudioElement | null>(null)

    const [timeString, setTimeString] = useState("")
    const [dateString, setDateString] = useState("")

    useEffect(() => {
        const tick = () => {
            const now = new Date()
            setTimeString(
                now.toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit" })
            )
            setDateString(
                now.toLocaleDateString("fr-DZ", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                })
            )
        }
        tick()
        const iv = setInterval(tick, 10000)
        return () => clearInterval(iv)
    }, [])

  const [videoSources, setVideoSources] = useState<string[]>([])

    useEffect(() => {
        let cancelled = false
        const loadVideos = async () => {
            try {
                const response = await fetch(resolveApiUrl("/api/videos"))
                if (!response.ok) return
        const payload = (await response.json()) as { videos?: Array<{ url: string; sortOrder: number }> }
        const videos = payload.videos ?? []
        const ordered = [...videos].sort((a, b) => a.sortOrder - b.sortOrder)
        const urls = ordered.map((video) => resolveApiUrl(video.url)).filter(Boolean)
        if (!cancelled) {
          setVideoSources(urls)
        }
      } catch {
        // ignore
      }
    }
        loadVideos()
        const iv = setInterval(loadVideos, 30000)
        return () => {
            cancelled = true
            clearInterval(iv)
        }
    }, [])

    useEffect(() => {
        if (typeof window === "undefined") return

        notificationAudioRef.current = new Audio("/sounds/gustavorezende-airport-call-157168.mp3")
        notificationAudioRef.current.preload = "auto"

        const unlockAudio = async () => {
            try {
                const AudioContextCtor = window.AudioContext || (window as typeof window & {
                    webkitAudioContext?: typeof AudioContext
                }).webkitAudioContext
                if (!AudioContextCtor) return

                if (!audioContextRef.current) {
                    audioContextRef.current = new AudioContextCtor()
                }

                if (audioContextRef.current.state === "suspended") {
                    await audioContextRef.current.resume()
                }

                if (notificationAudioRef.current) {
                    notificationAudioRef.current.muted = true
                    await notificationAudioRef.current.play().catch(() => null)
                    notificationAudioRef.current.pause()
                    notificationAudioRef.current.currentTime = 0
                    notificationAudioRef.current.muted = false
                }
            } catch {
                // ignore audio unlock failures
            }
        }

        window.addEventListener("pointerdown", unlockAudio)
        window.addEventListener("keydown", unlockAudio)

        return () => {
            window.removeEventListener("pointerdown", unlockAudio)
            window.removeEventListener("keydown", unlockAudio)
        }
    }, [])

    useEffect(() => {
        if (mode !== "CALLING" || !data?.updatedAt) return
        if (lastPlayedUpdateRef.current === data.updatedAt) return
        lastPlayedUpdateRef.current = data.updatedAt

        const playSynthFallback = async () => {
            const AudioContextCtor = window.AudioContext || (window as typeof window & {
                webkitAudioContext?: typeof AudioContext
            }).webkitAudioContext
            if (!AudioContextCtor) return

            const context = audioContextRef.current ?? new AudioContextCtor()
            audioContextRef.current = context

            if (context.state === "suspended") {
                await context.resume()
            }

            const now = context.currentTime
            const notes = [880, 1174, 1568]

            notes.forEach((frequency, index) => {
                const oscillator = context.createOscillator()
                const gainNode = context.createGain()
                const start = now + index * 0.18
                const end = start + 0.14

                oscillator.type = "sine"
                oscillator.frequency.setValueAtTime(frequency, start)

                gainNode.gain.setValueAtTime(0.0001, start)
                gainNode.gain.exponentialRampToValueAtTime(0.18, start + 0.02)
                gainNode.gain.exponentialRampToValueAtTime(0.0001, end)

                oscillator.connect(gainNode)
                gainNode.connect(context.destination)
                oscillator.start(start)
                oscillator.stop(end)
            })
        }

        const playNotification = async () => {
            try {
                if (notificationAudioRef.current) {
                    notificationAudioRef.current.pause()
                    notificationAudioRef.current.currentTime = 0
                    await notificationAudioRef.current.play()
                    return
                }
            } catch {
                try {
                    await playSynthFallback()
                } catch {
                    // Browser autoplay policy may block audio until the page is user-activated.
                }
            }
        }

        playNotification()
    }, [data?.updatedAt, mode])

    return (
        <DisplayShell mode={mode} timeString={timeString} dateString={dateString}>
            {mode === "OFF" ? (
                <div className="flex flex-col items-center justify-center rounded-2xl bg-white shadow-sm border border-black/5 p-10 min-h-[360px] text-center">
                    <BrandLogo size="lg" variant="default" className="mb-6" priority />
                    <div className="text-2xl md:text-3xl font-semibold text-foreground">
                        Ecran hors service
                    </div>
                    <div className="text-base text-muted-foreground mt-2">
                        / الشاشة غير متاحة
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {mode === "IDLE" && (
                        <div className="flex justify-center">
                        </div>
                    )}
          <VideoPlayer sources={videoSources}>
            <CallingOverlay
              visible={mode === "CALLING"}
              queueNumber={queueNumber ?? undefined}
              patientName={patientName}
              serviceName={destination?.serviceName}
              doctorTitle={destination?.doctorTitle}
            />
          </VideoPlayer>
                </div>
            )}
        </DisplayShell>
    )
}
