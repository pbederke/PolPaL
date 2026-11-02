"use client";

import Image from "next/image";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

const teamMembers = [
    {
        name: "Paul Bederke",
        image: "/images/persons/paul.jpg",
        affiliation: "Department of Political Science – Aarhus University",
        address: ["Bartholins Allé 7, Building 1332", "8000 Aarhus C", "Denmark"],
        email: "paulbederke@ps.au.dk",
        bio: "I am a PhD student at Aarhus University, interested in climate-related disasters and their effect on women's political participation. Previously, I worked at GESIS — Leibniz-Institute for the Social Sciences and at Gothenburg University. From 2020/06 to 2026/07, I was the project coordinator of Party Facts.",
    },
    {
        name: "Dr. Lea Kaftan",
        image: "/images/persons/lea.png",
        affiliation: "GESIS – Leibniz Institute for the Social Sciences",
        address: ["Unter Sachsenhausen 6-8", "50667 Cologne", "Germany"],
        email: "lea.kaftan@gesis.org",
        bio: "I am a senior researcher at GESIS — Leibniz-Institute for the Social Sciences, and affiliated with the MEDem project (medem.eu) and my alma mater, the University of Cologne. I am a big fan of democracy, survey research, political elites, and computational social sciences.",
    },
];

export default function ContactClient() {
    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <Breadcrumbs items={[
                { label: "Home", href: "/" },
                { label: "Contact" },
            ]} />

            <section id="contact" className="bg-white rounded-xl shadow-md p-8">
                <h1 className="text-2xl font-bold mb-2 text-primary">Contact</h1>
                <p className="text-gray-600 mb-8">Here you can find the contact details of our team members.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {teamMembers.map((person) => (
                        <div
                            key={person.name}
                            className="flex flex-col items-center text-center gap-4 rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="relative w-28 h-28 rounded-full overflow-hidden ring-2 ring-primary/20 shrink-0">
                                <Image
                                    src={person.image}
                                    alt={`Photo of ${person.name}`}
                                    fill
                                    sizes="112px"
                                    className="object-cover"
                                />
                            </div>
                            <div className="space-y-1">
                                <p className="text-lg font-semibold text-gray-900">{person.name}</p>
                                <p className="text-sm text-primary font-medium">{person.affiliation}</p>
                                <div className="text-sm text-gray-500 leading-relaxed">
                                    {person.address.map((line) => (
                                        <p key={line}>{line}</p>
                                    ))}
                                </div>
                                <p className="text-sm text-gray-700 pt-1">
                                    <span className="font-medium">Email:</span>{" "}
                                    {person.email.startsWith("XXX") ? (
                                        <span className="italic text-gray-400">{person.email}</span>
                                    ) : (
                                        <a href={`mailto:${person.email}`} className="text-primary hover:underline">
                                            {person.email}
                                        </a>
                                    )}
                                </p>
                                {person.bio && (
                                    <p className="text-sm text-gray-600 italic pt-2 leading-relaxed text-justify">{person.bio}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
