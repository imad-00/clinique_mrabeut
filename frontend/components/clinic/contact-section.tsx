"use client"

import { useI18n } from "@/src/lib/i18n/context"
import { Card, CardContent } from "@/components/ui/card"
import { MapPin, Phone, Mail, Clock } from "lucide-react"
import Image from "next/image"

export function ContactSection() {
    const { t } = useI18n()
    const phoneValue = t("topbar_phone")

    const contactInfo = [
        {
            icon: MapPin,
            label: t("contact_address"),
            value: t("contact_address_value"),
            href: "https://maps.google.com/?q=08%20Rue%20Hamel%20Slimane%2C%20Sidi%20Bel%20Abb%C3%A8s",
        },
        { icon: Phone, label: t("contact_phone"), value: phoneValue, href: "tel:+21348745772" },
        { icon: Mail, label: t("contact_email"), value: t("topbar_email"), href: "mailto:cliniquemrabeut@gmail.com" },
        { icon: Clock, label: t("contact_hours"), value: t("contact_hours_value") },
    ]

    return (
        <section id="contact" className="relative py-16 md:py-24 overflow-hidden">
            <div className="absolute inset-0">
                <Image
                    src="/images/clinic-location.png"
                    alt=""
                    fill
                    className="object-cover object-center object-[50%_69%] scale-105"
                    sizes="100vw"
                />
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(6,42,31,0.9),rgba(7,154,99,0.54),rgba(5,28,21,0.84))]" />
            </div>

            <div className="relative container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 text-balance">
                        {t("contact_title")}
                    </h2>
                    <p className="text-white max-w-2xl mx-auto text-lg">
                        {t("contact_subtitle")}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Contact Info Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {contactInfo.map((item) => {
                            const Icon = item.icon
                            const content = (
                                <>
                                    <div className="flex-shrink-0 rounded-lg bg-clinic-mint p-2.5">
                                        <Icon className="h-5 w-5 text-clinic-deep" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                                        <p
                                            className="text-sm text-muted-foreground mt-1"
                                            dir={item.icon === Phone ? "ltr" : undefined}
                                            style={item.icon === Phone ? { unicodeBidi: "isolate" } : undefined}
                                        >
                                            {item.value}
                                        </p>
                                    </div>
                                </>
                            )

                            return (
                                <Card key={item.label} className="border-white/15 bg-white shadow-xl">
                                    <CardContent className="p-5">
                                        {item.href ? (
                                            <a
                                                href={item.href}
                                                target={item.icon === MapPin ? "_blank" : undefined}
                                                rel={item.icon === MapPin ? "noreferrer" : undefined}
                                                className="flex items-start gap-4 hover:opacity-80 transition-opacity"
                                            >
                                                {content}
                                            </a>
                                        ) : (
                                            <div className="flex items-start gap-4">
                                                {content}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>

                    {/* Map Placeholder */}
                    <Card className="overflow-hidden border-white/15 bg-white shadow-xl">
                        <CardContent className="p-0">
                            <div className="w-full h-full min-h-[300px] bg-muted flex items-center justify-center relative">
                                <iframe
                                    title="Clinic Location"
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3260.7173609141773!2d-0.6440229252330116!3d35.18859645688021!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd7f01b50180165d%3A0x51666fc05d6fb876!2sDr.%20Merabet%20ORL%20et%20cardiologie!5e0!3m2!1sen!2sdz!4v1770423065022!5m2!1sen!2sdz"
                                    className="w-full h-full min-h-[300px] border-0"
                                    loading="lazy"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    )
}
