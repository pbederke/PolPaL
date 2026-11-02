"use client";

import Link from "next/link";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export default function ImprintClient() {

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Breadcrumbs */}
            <Breadcrumbs items={[
                { label: "Home", href: "/" },
                { label: "Imprint" },
            ]} />
            <section id="imprint" className="bg-white rounded-xl shadow-md p-8">
                <h1 className="text-3xl font-bold mb-4 text-primary">Imprint</h1>
                <h2 className="text-2xl font-bold mb-4 text-primary">Provider & Legal Notices</h2>
                The information below includes the legally prescribed provider identification data as well as legal notices relating to the Internet presence of GESIS – Leibniz Institute for the Social Sciences.
                <h3 className="text-xl font-semibold mt-6 mb-4 text-primary">Provider</h3>
                The provider of this website is GESIS – Leibniz Institute for the Social Sciences. GESIS is represented at two locations and the association is based in Mannheim:
                <div className="ml-6 mt-4">
                    <p className="font-semibold">GESIS – Leibniz Institute for  the Social Sciences in Mannheim</p>
                    <p>Street address:</p>
                    <p>B6, 4-5</p>
                    <p>68159 Mannheim</p>
                    <p>Postal address: </p>
                    <p>PO Box 122155</p>
                    <p>68072 Mannheim</p>
                    <p>Germany</p>
                    <p>Phone.: +49 (0) 621/1246-0</p>
                    <p>Fax: +49 (0) 621/1246-100</p>
                </div>
                <div className="ml-6 mt-4">
                    <p className="font-semibold">GESIS – Leibniz Institute for  the Social Sciences in Cologne</p>
                    <p>Street address:</p>
                    <p>Unter Sachsenhausen 6-8</p>
                    <p>50667 Cologne</p>
                    <p>Germany</p>
                    <p>Phone: +49 (0) 221/47694-598</p>
                    <p>Fax: +49 (0) 221/47694-199</p>
                </div>
                <h4 className="font-semibold text-lg mb-2 mt-4">Representative</h4>
                <div className="ml-6 mt-4">
                    <p>Prof. Dr. Christof Wolf</p>
                    <p>President of GESIS </p>
                </div>
                <div className="ml-6 mt-4">
                    <p>Prof. Dr. Beatrice Rammstedt</p>
                    <p>Vice President of GESIS </p>
                </div>
                <div className="ml-6 mt-4">
                    <p>Jost Henze</p>
                    <p>Administrative Board Member </p>
                </div>
                <div className="ml-6 mt-4">
                    <p>Street address: B6,4-5; 68159 Mannheim, Germany</p>
                    <p>Postal address: PO Box 122155; 68072 Mannheim, Germany </p>
                    <p>Tel.: +49 (0) 621/1246-0</p>
                    <p>Fax: +49 (0) 621/1246-100</p>
                    <p>Email:</p>
                    <p>christof.wolf(at)gesis(dot)org</p>
                    <p>beatrice.rammstedt(at)gesis(dot)org</p>
                </div>
                <h4 className="font-semibold text-lg mb-2 mt-4">Registration Court</h4>
                <div className="ml-6 mt-4">
                    <p>Mannheim Local Court [Amtsgericht]</p>
                    <p>Association register number:  VR1449 </p>
                    <p>VAT identification number pursuant to § 27a of the German Turnover Tax Act (UStG): DE 814 839 735</p>
                </div>
                <h3 className="text-xl font-semibold mt-6 mb-4 text-primary">Legal Notices</h3>
                <div className="text-justify">
                    <p className="mb-4">GESIS – Leibniz Institute for the Social Sciences assumes no warranty for the information provided. Liability claims against GESIS that arise from the use of the information provided shall be excluded, except in the case of intent or gross negligence. All services are subject to change and are non-binding. GESIS expressly reserves the right to change, supplement, or delete parts of the webpages or the entire content without prior notice or to cease publication temporarily or permanently.</p>
                    <p>GESIS – Leibniz Institute for the Social Sciences (hereinafter referred to in brief as &quot;GESIS&quot;) expressly dissociates itself from the contents of external webpages that are referenced directly or indirectly (e.g., via so-called &quot;links&quot;) on its website.  GESIS hereby expressly declares that, at the time the links were set, the linked pages were free of illegal content. GESIS has no influence whatsoever on the current or future design, contents, or authorship of the linked pages. It therefore hereby dissociates itself expressly from all contents of all linked pages that were changed after the links were set. This statement applies to all links set and references made within GESIS&apos; own website, as well as to external entries in guest books, discussion forums, and mailing lists established by GESIS.  Liability for illegal, incorrect, or incomplete content, and especially for damages arising from the use of such information, shall lie solely with the provider of the referenced website, not with the party who merely refers to the respective publication via links.</p>
                </div>
                <h4 className="font-semibold text-lg mb-2 mt-4">Copyright</h4>
                <div className="text-justify">
                    <p className="mb-4">Copyright in published objects created by GESIS itself remains solely with GESIS. The reproduction or use of such graphics, audio documents, video sequences, and texts in other electronic or print publications is not permitted without the express permission of GESIS.</p>
                </div>
                <h4 className="font-semibold text-lg mb-2 mt-4">Data Protection</h4>
                <div className="text-justify">
                    <p className="mb-4">The protection of your privacy when using our webpages is important to us. Our procedures for collecting and processing personal data are explained in detail on our <Link className="text-primary underline" href="/documentation/data-protection">Data Protection</Link> page.</p>
                </div>
            </section>
        </main>
    );
}
