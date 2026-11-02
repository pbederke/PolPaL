"use client";

import Link from "next/link";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { ExternalLinkIcon } from "lucide-react";

export default function DataProtectionClient() {

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Breadcrumbs */}
            <Breadcrumbs items={[
                { label: "Home", href: "/" },
                { label: "Data Protection" },
            ]} />

            <section id="data-protection" className="bg-white rounded-xl shadow-md p-8">
                <h1 className="text-2xl font-bold mb-4 text-primary">Data Protection</h1>
                <div className="space-y-6">
                    <div className="text-justify">
                        <p>
                            PolPaL operates in accordance with the EU General Data Protection Regulation and all other statutory data protection provisions.
                        </p>
                        <p className="mt-4">
                            The protection of your personal rights when handling your data is important to us. With the following information, we would like to inform you which data are processed during your visit to our website, on the basis of which legal basis the data processing takes place and what your data protection rights are.
                        </p>
                        <p className="mt-4">
                            PolPaL reserves the right to update this privacy policy from time to time. Therefore, we recommend that it be read at regular intervals.
                        </p>
                    </div>

                    <div className="text-justify">
                        <h3 className="font-semibold text-lg mb-2">Contact Data</h3>
                        <p>
                            The controller within the meaning of Article 4(7) of the EU General Data Protection Regulation (GDPR) is:
                        </p>
                        <div className="ml-6 mt-4">
                            <p>GESIS – Leibniz Institute for the Social Sciences in Cologne</p>
                            <p>Unter Sachsenhausen 6-8</p>
                            <p>50667 Cologne</p>
                            <p>Germany</p>
                        </div>
                        <p className="mt-4">
                            For further information, see the details on our <Link className="text-primary hover:underline hover:text-primary/90" href="/documentation/imprint">Imprint</Link> page.
                        </p>
                    </div>

                    <div className="text-justify">
                        <h3 className="font-semibold text-lg mb-2">Data Protection Officer</h3>
                        <p>
                            If you have any questions about data protection, please contact our data protection officer:
                        </p>
                        <div className="ml-6 mt-4">
                            <p>HEC Harald Eul Consulting GmbH</p>
                            <p>Datenschutzbeauftragte GESIS</p>
                            <p>Auf der Höhe 34</p>
                            <p>50321 Brühl</p>
                            <p>Germany</p>
                            <p>Email: Datenschutz-GESIS(at)he-c(dot)de</p>
                        </div>
                    </div>

                    <div className="text-justify">
                        <h3 className="font-semibold text-lg mb-2">Usage Data</h3>
                        <p>
                            For the purposes of protecting our services against abuse and automated attacks, PolPaL&apos;s application processes pseudonymised IP addresses on the basis of Article 6 paragraph 1 letter f of the General Data Protection Regulation (GDPR). The legitimate interest pursued is the security and availability of the platform.
                        </p>
                        <p className="mt-4">
                            IP addresses are pseudonymised using a one-way cryptographic function (HMAC-SHA256) before being stored by the application. They are used solely for rate limiting (e.g. limiting repeated login or registration attempts from a single source) and security event monitoring. Raw IP addresses are never persisted by the application. No personal user profiles are created.
                        </p>
                        <p className="mt-4">
                            Access logs at the infrastructure level — including IP addresses, User Agent strings, and URLs — are processed by Clever Cloud as PolPaL&apos;s hosting provider. This is described in the <span className="font-medium">Clever Cloud as Data Processor</span> section below.
                        </p>
                    </div>

                    <div className="text-justify">
                        <h3 className="font-semibold text-lg mb-2">User Account Data</h3>
                        <p>
                            For registered users, we store the following information:
                        </p>
                        <ul className="list-disc list-inside ml-6 mt-4">
                            <li>first name</li>
                            <li>last name</li>
                            <li>email address</li>
                            <li>username</li>
                            <li>user ID</li>
                            <li>password (securely hashed using bcrypt with salt, never stored in plain text)</li>
                            <li>account role</li>
                            <li>email verification status</li>
                            <li>admin approval status</li>
                            <li>timestamps for account creation and last update</li>
                        </ul>
                        <p className="mt-4">
                            Additionally, we log data-altering actions performed by the user (e.g. creating or editing records) in a changelog, linked to the user account. 
                            The legal basis for this processing is Article 6 paragraph 1 letter b GDPR (performance of the contract for use of the service).
                            We do not log changes to user account data itself (e.g. password changes, email changes) in the changelog.
                        </p>
                        <p className="mt-4">
                            The stored email address may be used to contact the user regarding their account — for example, to send email verification links, password reset instructions, or notifications related to the administration of their account (e.g. approval by an administrator).
                        </p>
                        <p className="mt-4">
                            Registered users can request deletion of their account by contacting us. We will delete all associated data as soon as technically possible. Due to our backup infrastructure, it may take up to 7 days until user data is removed from all parts of our technical infrastructure.
                        </p>
                        <p className="mt-4">
                            Registration and use of PolPaL is permitted only for persons who are at least 18 years of age. By registering, you confirm that you meet this requirement.
                        </p>
                    </div>

                    <div className="text-justify">
                        <h3 className="font-semibold text-lg mb-2">Contact Options</h3>
                        <p>
                            You have the opportunity to contact us by electronic mail. The data you provide will only be used to answer your enquiry. Your data will only be passed on to third parties if this is necessary to process your request. The legal basis for the use of your data is Article 6 paragraph 1 letter f of the GDPR. We have a legitimate interest in being in contact with the users of the website and in answering any questions you may have or sending information.
                        </p>
                    </div>

                    <div className="text-justify">
                        <h3 className="font-semibold text-lg mb-2">Transactional Email Communications</h3>
                        <p>
                            Automated emails sent by PolPaL — such as verification links, password reset instructions, and account notifications — are delivered via the email infrastructure provided by IONOS SE. Their servers operate exclusively within the European Union. A Data Processing Agreement (DPA) has been concluded with this provider to ensure compliance with applicable data protection regulations. All transmissions between our application and the mail server are encrypted using TLS/SSL.
                        </p>
                    </div>

                    <div className="text-justify">
                        <h3 className="font-semibold text-lg mb-2">Duration of Data Storage</h3>
                        <p>
                            We only store your data for as long as is necessary for the provision of our services and there are no retention periods to prevent deletion.
                        </p>
                    </div>

                    <div className="text-justify">
                        <h3 className="font-semibold text-lg mb-2">Data Protection Rights of Users of this Website</h3>
                        <p>
                            In accordance with the GDPR, you have the following rights regarding your personal data:
                        </p>
                        <ul className="list-disc list-inside ml-6 mt-4 space-y-1">
                            <li><span className="font-medium">Right of access</span> (Art. 15 GDPR) — you may request information about which personal data we hold about you and for what purpose.</li>
                            <li><span className="font-medium">Right to rectification</span> (Art. 16 GDPR) — you may have inaccurate or incomplete data corrected.</li>
                            <li><span className="font-medium">Right to erasure</span> (Art. 17 GDPR) — you may request deletion of your data where its storage is no longer lawful or necessary.</li>
                            <li><span className="font-medium">Right to restriction of processing</span> (Art. 18 GDPR) — you may request that we limit how we use your data in certain circumstances.</li>
                            <li><span className="font-medium">Right to data portability</span> (Art. 20 GDPR) — you may receive your data in a structured, commonly used format where processing is based on a contract or consent and carried out by automated means.</li>
                            <li><span className="font-medium">Right to object</span> (Art. 21 GDPR) — where we process your data on the basis of legitimate interest (Art. 6(1)(f) GDPR), you have the right to object at any time. We will then cease processing unless we can demonstrate compelling legitimate grounds that override your interests.</li>
                        </ul>
                        <p className="mt-4">
                            To exercise any of these rights, please contact our Data Controller (<em>see contact details above</em>).
                        </p>
                        <p className="mt-4">
                            You also have the right to lodge a complaint with a competent supervisory authority. The responsible authority for GESIS in Germany is the{" "}
                            <Link
                                href="https://www.ldi.nrw.de/"
                                className="text-primary hover:underline hover:text-primary/90"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Landesbeauftragte für den Datenschutz und die Informationsfreiheit Nordrhein-Westfalen (LDI NRW)
                            </Link>
                            <ExternalLinkIcon className="inline-block w-3 h-3 ml-1 text-primary" />
                            . A list of all EU supervisory authorities is available at{" "}
                            <Link
                                href="https://edpb.europa.eu/about-edpb/about-edpb/members_en"
                                className="text-primary hover:underline hover:text-primary/90"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                edpb.europa.eu
                            </Link>
                            <ExternalLinkIcon className="inline-block w-3 h-3 ml-1 text-primary" />
                            .
                        </p>
                    </div>

                </div>
            </section>

            <section id="cookies" className="bg-white rounded-xl shadow-md p-8">
                <h2 className="text-2xl font-bold mb-4 text-primary">Cookies on PolPaL&apos;s website</h2>
                <div className="space-y-6">
                    <div className="text-justify">
                        <p>
                            Cookies are small text files placed on your device by your web browser when you visit a website. PolPaL uses a single strictly necessary cookie for authentication purposes only. We do not use cookies for tracking, analytics, or advertising, and we do not share any cookie data with third parties.
                        </p>
                        <table className="mt-4 w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                            <tbody className="divide-y divide-gray-100">
                                <tr>
                                    <td className="px-4 py-2 font-medium text-gray-600 align-top">Name</td>
                                    <td className="px-4 py-2"><code className="bg-gray-100 px-1 rounded">polpal_token</code></td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-2 font-medium text-gray-600 align-top">Purpose</td>
                                    <td className="px-4 py-2">
                                        <p>Stores a signed authentication token (JWT, HS256) used to identify the user as a logged-in user.</p>
                                        <ul className="list-disc list-inside ml-2 mt-1">
                                            <li>internal user ID</li>
                                            <li>username</li>
                                            <li>account role</li>
                                            <li>admin approval status</li>
                                            <li>token version number</li>
                                        </ul>
                                        <p className="mt-1">Does <span className="font-medium">not</span> contain the user&apos;s password, email address, or any other personal data.</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-2 font-medium text-gray-600 align-top">Lifetime</td>
                                    <td className="px-4 py-2">6 hours after login, or when the user logs out.</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-2 font-medium text-gray-600 align-top">Accessible to scripts</td>
                                    <td className="px-4 py-2">The cookie is marked <code className="bg-gray-100 px-1 rounded">HttpOnly</code>, meaning it cannot be read by JavaScript and is only transmitted to the server.</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-2 font-medium text-gray-600 align-top">Scope</td>
                                    <td className="px-4 py-2">The cookie is marked <code className="bg-gray-100 px-1 rounded">SameSite=Strict</code>, meaning it is sent only to PolPaL&apos;s own domain.</td>
                                </tr>
                            </tbody>
                        </table>
                        <p className="mt-4">
                            This cookie is strictly necessary for the operation of the website and does not require your consent. The legal basis for processing the data contained in this cookie is Article 6 paragraph 1 letter b GDPR (performance of the contract for use of the service).
                        </p>
                    </div>
                </div>
            </section>

            <section id="clever-cloud" className="bg-white rounded-xl shadow-md p-8">
                <h2 className="text-2xl font-bold mb-4 text-primary">Clever Cloud as Data Processor</h2>
                <div className="space-y-6">
                    <div className="text-justify mb-4">
                        <p>
                            This website is hosted by Clever Cloud, a cloud service provider based in France.
                            For more information on data protection at Clever Cloud, please refer to their privacy policy.
                            Clever Cloud&apos;s Privacy Policy can be found here:{" "}
                            <Link
                                href="https://www.clever.cloud/privacy-policy/"
                                className="text-primary hover:underline hover:text-primary/90"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                https://www.clever.cloud/privacy-policy/
                            </Link>
                            <ExternalLinkIcon className="inline-block w-3 h-3 ml-1 text-primary" />
                            .
                        </p>
                        <p className="mt-4">
                            All data is stored on servers located in the European Union.
                            Clever Cloud ensures compliance with the EU General Data Protection Regulation (GDPR) and is ISO 27001 certified.
                        </p>
                        <p className="mt-4">
                            As part of operating the hosting platform, Clever Cloud processes the following personal data on behalf of PolPaL (as data controller) on the basis of Article 6 paragraph 1 letter f GDPR.
                            The legitimate interest is ensuring platform security, error management, and access logging:
                        </p>
                        <ul className="list-disc list-inside ml-6 mt-4">
                            <li>IP address of the connection to the platform</li>
                            <li>User Agent (browser and client identification)</li>
                            <li>URLs of resources accessed</li>
                        </ul>
                        <p className="mt-4">
                            This processing is governed by the{" "}
                            <Link
                                href="https://www.clever.cloud/general-terms-and-conditions-of-use/clever-cloud-data-processing-agreement/"
                                className="text-primary hover:underline hover:text-primary/90"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Clever Cloud Data Processing Agreement
                            </Link>
                            <ExternalLinkIcon className="inline-block w-3 h-3 ml-1 text-primary" />
                            {" "}(DPA), under which Clever Cloud acts as a data processor and PolPaL acts as data controller. Data is retained for the duration of the service agreement.
                        </p>
                    </div>
                </div>
            </section>

            <section id="disclaimer" className="bg-white rounded-xl shadow-md p-8">
                <h2 className="text-2xl font-bold mb-4 text-primary">Disclaimer</h2>
                <div className="space-y-6">
                    <div className="text-justify">
                        <h3 className="font-semibold text-lg mb-2">Liability for Links</h3>
                        <p>
                            This website contains links to external third-party websites over whose content we have no control. We therefore accept no liability for the content of those pages. The respective provider or operator of each linked page is solely responsible for its content. Linked pages were checked for potential legal violations at the time of linking; no unlawful content was apparent at that time. Permanent monitoring of linked pages is not reasonable without concrete evidence of a legal violation. If we become aware of any legal violations, we will remove the relevant links without delay.
                        </p>
                        <h3 className="font-semibold text-lg mb-2 mt-4">Liability for Own Content</h3>
                        <p>
                            The content on this website has been created with care. However, we cannot guarantee that the information provided is accurate, complete, or up to date. As a service provider, we are responsible for our own content on this website in accordance with general law. We are not obliged to monitor transmitted or stored third-party information or to investigate circumstances that point to illegal activity.
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}
