"use client";

import { ExternalLink, X, Plus, Pencil, Check } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { TableNameAboutEnum } from "@/lib/shared/enums";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import Link from 'next/link';
import Image from 'next/image';
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorState } from "@/components/ui/ErrorState";
import NotFoundState from "@/components/ui/NotFoundState";

interface AboutData {
    id: number;
    tableName: TableNameAboutEnum;
    name: string | null;
    affiliation: string | null;
    time: string | null;
    url: string | null;
    funding: string | null;
    comment: string | null;
}

type RowForm = {
    name: string;
    affiliation: string;
    time: string;
    url: string;
    funding: string;
};

const toForm = (entry: AboutData): RowForm => ({
    name: entry.name ?? "",
    affiliation: entry.affiliation ?? "",
    time: entry.time ?? "",
    url: entry.url ?? "",
    funding: entry.funding ?? "",
});

const emptyForm = (): RowForm => ({ name: "", affiliation: "", time: "", url: "", funding: "" });

const INPUT_CLS =
    "w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary";

export default function AboutClient() {
    const [aboutData, setAboutData] = useState<AboutData[]>([]);
    const { auth } = useAuth();
    const [loadingData, setLoadingData] = useState(true);
    const [errorData, setErrorData] = useState<string | null>(null);

    // new-row forms keyed by tableName
    const [newRows, setNewRows] = useState<Record<string, RowForm>>({
        [TableNameAboutEnum.member]: emptyForm(),
        [TableNameAboutEnum.student]: emptyForm(),
        [TableNameAboutEnum.contribution]: emptyForm(),
        [TableNameAboutEnum.grants]: emptyForm(),
        [TableNameAboutEnum.support]: emptyForm(),
    });

    // inline edit state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<RowForm>(emptyForm());

    const canManage = !!(
        auth?.role &&
        (auth.role.includes("ADMIN") || auth.role.includes("DATAMANAGER"))
    );

    useEffect(() => {
        const abortController = new AbortController();
        const { signal } = abortController;

        const fetchData = async () => {
            setLoadingData(true);
            setErrorData(null);
            try {
                const res = await fetch(`/api/about/`, { credentials: "include", signal });
                if (!res.ok) throw new Error(await res.text());
                setAboutData(await res.json());
            } catch (err: unknown) {
                if (err instanceof Error && err.name !== "AbortError") setErrorData(err instanceof Error ? err.message : String(err));
            } finally {
                if (!abortController.signal.aborted) setLoadingData(false);
            }
        };

        fetchData();
        return () => abortController.abort();
    }, []);

    const startEdit = (entry: AboutData) => {
        setEditingId(entry.id);
        setEditForm(toForm(entry));
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm(emptyForm());
    };

    const handleSave = async (id: number) => {
        try {
            const res = await fetch(`/api/about/${id}`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editForm.name || null,
                    affiliation: editForm.affiliation || null,
                    time: editForm.time || null,
                    url: editForm.url || null,
                    funding: editForm.funding || null,
                }),
            });
            if (!res.ok) throw new Error(await res.text());
            const updated: AboutData = await res.json();
            setAboutData((prev) => prev.map((e) => (e.id === id ? updated : e)));
            cancelEdit();
        } catch (err: unknown) {
            alert(`Failed to update entry: ${err}`);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this entry?")) return;
        try {
            const res = await fetch(`/api/about/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) throw new Error(await res.text());
            setAboutData((prev) => prev.filter((e) => e.id !== id));
            if (editingId === id) cancelEdit();
        } catch (err: unknown) {
            alert(`Failed to delete entry: ${err}`);
        }
    };

    const handleAdd = async (tableName: TableNameAboutEnum) => {
        const row = newRows[tableName];
        try {
            const res = await fetch(`/api/about/`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tableName,
                    name: row.name || null,
                    affiliation: row.affiliation || null,
                    time: row.time || null,
                    url: row.url || null,
                    funding: row.funding || null,
                }),
            });
            if (!res.ok) throw new Error(await res.text());
            const newEntry = await res.json();
            setAboutData((prev) => [...prev, newEntry]);
            setNewRows((prev) => ({ ...prev, [tableName]: emptyForm() }));
        } catch (err: unknown) {
            alert(`Failed to add entry: ${err}`);
        }
    };

    const updateNewRow = (tableName: string, field: keyof RowForm, value: string) => {
        setNewRows((prev) => ({ ...prev, [tableName]: { ...prev[tableName], [field]: value } }));
    };

    const rows = (tableName: TableNameAboutEnum) =>
        aboutData.filter((e) => e.tableName === tableName);

    if (loadingData)
        return <LoadingSpinner title="Loading about data..." message={<>Fetching about data...</>} />;
    if (errorData)
        return (
            <ErrorState
                message={<>We encountered an issue while loading the about data.</>}
                error={errorData}
                backHref="/data/projects/"
                backLabel="Back to Data Projects"
            />
        );
    if (!aboutData && !loadingData)
        return (
            <NotFoundState
                title="About Data Not Found"
                message={<>The about data could not be found or you don&apos;t have permission to view it.</>}
                backHref="/data/projects"
                backLabel="Back to Data Projects"
            />
        );

    // ── action cell ───────────────────────────────────────────────────────────
    const ActionCell = ({ entry }: { entry: AboutData }) => {
        if (!canManage) return null;
        if (editingId === entry.id) {
            return (
                <td className="py-2 px-1 whitespace-nowrap">
                    <button
                        onClick={() => handleSave(entry.id)}
                        className="text-primary hover:text-primary/80 transition-colors rounded p-0.5 mr-0.5"
                        aria-label="Save"
                    >
                        <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={cancelEdit}
                        className="text-gray-400 hover:text-gray-600 transition-colors rounded p-0.5"
                        aria-label="Cancel"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </td>
            );
        }
        return (
            <td className="py-2 px-1 whitespace-nowrap">
                <button
                    onClick={() => startEdit(entry)}
                    className="text-gray-400 hover:text-primary transition-colors rounded p-0.5 mr-0.5"
                    aria-label="Edit entry"
                >
                    <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors rounded p-0.5"
                    aria-label="Delete entry"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </td>
        );
    };

    // ── Person table (name | affiliation | time) ──────────────────────────────
    const renderPersonTable = (tableName: TableNameAboutEnum) => {
        const entries = rows(tableName);
        const form = newRows[tableName];
        return (
            <table className="w-full mt-4">
                <tbody>
                    {entries.map((entry) =>
                        editingId === entry.id ? (
                            <tr key={entry.id} className="border-b border-gray-100 bg-blue-50">
                                <td className="py-2 px-3 w-3/12">
                                    <input
                                        className={INPUT_CLS}
                                        value={editForm.name}
                                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                    />
                                </td>
                                <td className="py-2 px-3 w-6/12">
                                    <input
                                        className={INPUT_CLS}
                                        value={editForm.affiliation}
                                        onChange={(e) => setEditForm((f) => ({ ...f, affiliation: e.target.value }))}
                                    />
                                </td>
                                <td className="py-2 px-3 w-3/12">
                                    <input
                                        className={INPUT_CLS}
                                        value={editForm.time}
                                        onChange={(e) => setEditForm((f) => ({ ...f, time: e.target.value }))}
                                    />
                                </td>
                                <ActionCell entry={entry} />
                            </tr>
                        ) : (
                            <tr key={entry.id} className="border-b border-gray-100">
                                <td className="py-2 px-3 w-3/12">{entry.name}</td>
                                <td className="py-2 px-3 w-6/12">{entry.affiliation}</td>
                                <td className="py-2 px-3 w-3/12">{entry.time}</td>
                                <ActionCell entry={entry} />
                            </tr>
                        )
                    )}
                    {canManage && (
                        <tr className="border-t border-gray-200 bg-white">
                            <td className="py-2 px-3 w-3/12">
                                <input
                                    className={INPUT_CLS}
                                    placeholder="Name"
                                    value={form.name}
                                    onChange={(e) => updateNewRow(tableName, "name", e.target.value)}
                                />
                            </td>
                            <td className="py-2 px-3 w-6/12">
                                <input
                                    className={INPUT_CLS}
                                    placeholder="Affiliation"
                                    value={form.affiliation}
                                    onChange={(e) => updateNewRow(tableName, "affiliation", e.target.value)}
                                />
                            </td>
                            <td className="py-2 px-3 w-3/12">
                                <input
                                    className={INPUT_CLS}
                                    placeholder="Time"
                                    value={form.time}
                                    onChange={(e) => updateNewRow(tableName, "time", e.target.value)}
                                />
                            </td>
                            <td className="py-2 px-1">
                                <button
                                    onClick={() => handleAdd(tableName)}
                                    className="text-primary hover:text-primary/80 transition-colors rounded p-0.5"
                                    aria-label="Add entry"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                </button>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        );
    };

    // ── Grants table (name | url | funding) ───────────────────────────────────
    const renderGrantsTable = () => {
        const entries = rows(TableNameAboutEnum.grants);
        const form = newRows[TableNameAboutEnum.grants];
        return (
            <table className="w-full mt-4">
                <tbody>
                    {entries.map((entry) =>
                        editingId === entry.id ? (
                            <tr key={entry.id} className="border-b border-gray-100 bg-blue-50">
                                <td className="py-2 px-3 w-6/12">
                                    <input
                                        className={INPUT_CLS}
                                        value={editForm.name}
                                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                    />
                                </td>
                                <td className="py-2 px-3 w-4/12">
                                    <input
                                        className={INPUT_CLS}
                                        placeholder="URL"
                                        value={editForm.url}
                                        onChange={(e) => setEditForm((f) => ({ ...f, url: e.target.value }))}
                                    />
                                </td>
                                <td className="py-2 px-3 w-2/12">
                                    <input
                                        className={INPUT_CLS}
                                        placeholder="Amount"
                                        value={editForm.funding}
                                        onChange={(e) => setEditForm((f) => ({ ...f, funding: e.target.value }))}
                                    />
                                </td>
                                <ActionCell entry={entry} />
                            </tr>
                        ) : (
                            <tr key={entry.id} className="border-b border-gray-100">
                                <td className="py-2 px-3 w-6/12">{entry.name}</td>
                                <td className="py-2 px-3 w-4/12">
                                    {entry.url && (
                                        <a
                                            href={entry.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline transition-all duration-200 inline-flex items-center gap-1"
                                        >
                                            {entry.url}
                                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                        </a>
                                    )}
                                </td>
                                <td className="py-2 px-3 w-2/12">{entry.funding}</td>
                                <ActionCell entry={entry} />
                            </tr>
                        )
                    )}
                    {canManage && (
                        <tr className="border-t border-gray-200 bg-white">
                            <td className="py-2 px-3 w-6/12">
                                <input
                                    className={INPUT_CLS}
                                    placeholder="Name"
                                    value={form.name}
                                    onChange={(e) =>
                                        updateNewRow(TableNameAboutEnum.grants, "name", e.target.value)
                                    }
                                />
                            </td>
                            <td className="py-2 px-3 w-4/12">
                                <input
                                    className={INPUT_CLS}
                                    placeholder="URL"
                                    value={form.url}
                                    onChange={(e) =>
                                        updateNewRow(TableNameAboutEnum.grants, "url", e.target.value)
                                    }
                                />
                            </td>
                            <td className="py-2 px-3 w-2/12">
                                <input
                                    className={INPUT_CLS}
                                    placeholder="Amount"
                                    value={form.funding}
                                    onChange={(e) =>
                                        updateNewRow(TableNameAboutEnum.grants, "funding", e.target.value)
                                    }
                                />
                            </td>
                            <td className="py-2 px-1">
                                <button
                                    onClick={() => handleAdd(TableNameAboutEnum.grants)}
                                    className="text-primary hover:text-primary/80 transition-colors rounded p-0.5"
                                    aria-label="Add entry"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                </button>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        );
    };

    // ── Support table (name | url | funding) ────────────────────────────────────
    const renderSupportTable = () => {
        const entries = rows(TableNameAboutEnum.support);
        const form = newRows[TableNameAboutEnum.support];
        return (
            <table className="w-full mt-4">
                <tbody>
                    {entries.map((entry) =>
                        editingId === entry.id ? (
                            <tr key={entry.id} className="border-b border-gray-100 bg-blue-50">
                                <td className="py-2 px-3 w-6/12">
                                    <input
                                        className={INPUT_CLS}
                                        value={editForm.name}
                                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                    />
                                </td>
                                <td className="py-2 px-3 w-4/12">
                                    <input
                                        className={INPUT_CLS}
                                        placeholder="URL"
                                        value={editForm.url}
                                        onChange={(e) => setEditForm((f) => ({ ...f, url: e.target.value }))}
                                    />
                                </td>
                                <td className="py-2 px-3 w-2/12">
                                    <input
                                        className={INPUT_CLS}
                                        placeholder="Amount"
                                        value={editForm.funding}
                                        onChange={(e) => setEditForm((f) => ({ ...f, funding: e.target.value }))}
                                    />
                                </td>
                                <ActionCell entry={entry} />
                            </tr>
                        ) : (
                            <tr key={entry.id} className="border-b border-gray-100">
                                <td className="py-2 px-3 w-6/12">{entry.name}</td>
                                <td className="py-2 px-3 w-4/12">
                                    {entry.url && (
                                        <a
                                            href={entry.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline transition-all duration-200 inline-flex items-center gap-1"
                                        >
                                            {entry.url}
                                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                        </a>
                                    )}
                                </td>
                                <td className="py-2 px-3 w-2/12">{entry.funding}</td>
                                <ActionCell entry={entry} />
                            </tr>
                        )
                    )}
                    {canManage && (
                        <tr className="border-t border-gray-200 bg-white">
                            <td className="py-2 px-3 w-6/12">
                                <input
                                    className={INPUT_CLS}
                                    placeholder="Name"
                                    value={form.name}
                                    onChange={(e) =>
                                        updateNewRow(TableNameAboutEnum.support, "name", e.target.value)
                                    }
                                />
                            </td>
                            <td className="py-2 px-3 w-4/12">
                                <input
                                    className={INPUT_CLS}
                                    placeholder="URL"
                                    value={form.url}
                                    onChange={(e) =>
                                        updateNewRow(TableNameAboutEnum.support, "url", e.target.value)
                                    }
                                />
                            </td>
                            <td className="py-2 px-3 w-2/12">
                                <input
                                    className={INPUT_CLS}
                                    placeholder="Amount"
                                    value={form.funding}
                                    onChange={(e) =>
                                        updateNewRow(TableNameAboutEnum.support, "funding", e.target.value)
                                    }
                                />
                            </td>
                            <td className="py-2 px-1">
                                <button
                                    onClick={() => handleAdd(TableNameAboutEnum.support)}
                                    className="text-primary hover:text-primary/80 transition-colors rounded p-0.5"
                                    aria-label="Add entry"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                </button>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        );
    };

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

            {/* Breadcrumbs */}
            <Breadcrumbs items={[
                { label: "Home", href: "/" },
                { label: "Documentation" },
                { label: "About" },
            ]} />

            {/* About Section */}
            <section className="bg-white rounded-xl shadow-md border border-gray-200 p-8 mb-8">
                <h1 className="text-2xl font-bold mb-4 text-primary">About PolPaL</h1>
                <div className="space-y-4 text-justify mb-8">
                    <p>
                        PolPaL (Political Party Links) is a comprehensive database designed to facilitate the linkage of political entity data across various datasets and research projects. It provides standardized identifiers and metadata for political entities worldwide, enabling researchers to accurately match information about entities.
                    </p>
                    <p>
                        The database includes information on entity names, abbreviations, country affiliations, and historical developments. By using PolPaL, researchers can ensure consistency in entity identification, reducing errors and improving the reliability of comparative analyses.
                    </p>
                    <p>
                        PolPaL is maintained by a dedicated team of political scientists and data specialists committed to supporting the research community. The database is regularly updated to reflect changes in the political landscape and releases of new datasets.
                    </p>
                    <div className="flex items-center justify-between gap-5 border-b border-t border-gray-300 px-10 py-10 bg-white">
                        <Link
                            href="https://research-and-innovation.ec.europa.eu/funding/funding-opportunities/funding-programmes-and-open-calls/horizon-europe_en"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Image
                                src="/images/logos/eufunding_logo.png"
                                alt="EU Funding Logo"
                                width={300}
                                height={112}
                                className="hover:opacity-80 transition bg-white rounded"
                            />
                        </Link>
                        <Link href="https://oscars-project.eu/" target="_blank" rel="noopener noreferrer">
                            <Image
                                src="/images/logos/oscars_logo.png"
                                alt="OSCARS Logo"
                                width={280}
                                height={112}
                                className="hover:opacity-80 transition bg-white rounded"
                            />
                        </Link>
                        <Link href="https://www.gesis.org/" target="_blank" rel="noopener noreferrer">
                            <Image
                                src="/images/logos/gesis_logo.jpg"
                                alt="GESIS Logo"
                                width={300}
                                height={112}
                                className="hover:opacity-80 transition bg-white rounded"
                            />
                        </Link>
                        <Link href="https://www.medem.eu/" target="_blank" rel="noopener noreferrer">
                            <Image
                                src="/images/logos/medem_logo.png"
                                alt="MEDEM Logo"
                                width={200}
                                height={112}
                                className="hover:opacity-80 transition bg-white rounded"
                            />
                        </Link>
                    </div>
                </div>

                <h2 className="text-l font-bold mb-4 text-primary">Relation to Party Facts</h2>
                <div className="space-y-4 text-justify mb-8">
                    <p>
                        Party Facts (Döring & Regel 2019) has made invaluable contributions to linking parties
                        across a wide variety of datasets. We build upon the Party Facts’ core data model
                        (Bederke, Döring, & Regel, 2023) and extend it in several important ways.
                    </p>
                    <p>
                        We acknowledge that core parties, or PolPaL entities, are oftentimes linked to each
                        other in meaningful ways, e.g., when they are part of the same alliance or when one
                        is the predecessor or successor of another party. With PolPaL, users can discover these
                        links between parties without having to conduct additional research themselves and take
                        them into account when merging according to their use case.
                    </p>
                    <p>
                        In addition, we add a temporal dimension to mitigate issues with differences in the way in which
                        datasets treat party splits and mergers. For example, one dataset might provide information
                        on the German PDS/Left, treating it as one party, while another will provide information on
                        the PDS and the Left separately, treating the Left as the successor of the PDS. In PolPaL,
                        dataset observations for political parties can now be associated with multiple PolPaL
                        IDs across different points in time.
                    </p>
                    <p>
                        We rely on Party Facts’ core parties (Bederke, Döring, & Regel, 2023) as a starting point. For the
                        initial list of PolPaL entities, the PolPaL ID is identical to the Party Facts ID. We
                        include their names (short name, English name, original name), their Party Facts ID, the assigned
                        Wikipedia URL, and their country, if applicable, as given in Party Facts. Moreover, we integrated Party
                        Facts as an external dataset, allowing users to easily link PolPaL entities back to Party Facts core
                        parties.
                    </p>
                    <ul className="space-y-2 text-xs text-gray-500">
                        <li className="flex items-center gap-2">
                            <a
                                href="https://partyfacts.herokuapp.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline hover:text-primary transition-colors"
                            >
                                https://partyfacts.herokuapp.com/
                            </a>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </li>
                        <li className="flex items-center gap-2">
                            <span>
                                Döring, H., & Regel, S. (2019). Party Facts: A database of political parties worldwide. Party Politics, 25(2), 97-109.{" "}
                                <a
                                    href="https://doi.org/10.1177/1354068818820671"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline hover:text-primary transition-colors italic"
                                >
                                    https://doi.org/10.1177/1354068818820671
                                </a>
                            </span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </li>
                        <li className="flex items-center gap-2">
                            <span>
                                Bederke, Paul; Döring, Holger; Regel, Sven, 2023, &quot;Party Facts – Version 2023&quot;,{" "}
                                <a
                                    href="https://doi.org/10.7910/DVN/TJINLQ"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline hover:text-primary transition-colors italic"
                                >
                                    https://doi.org/10.7910/DVN/TJINLQ
                                </a>
                                , Harvard Dataverse, V1, UNF:6:WobavCRL6t8D7BIHsELRCw== [fileUNF]
                            </span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />

                        </li>
                    </ul>
                </div>
                <h2 className="text-l font-bold mb-4 text-primary">Relation to MEDem</h2>
                <div className="space-y-4 text-justify">
                    <p>
                        Monitoring Electoral Democracy (MEDem) is a new, evolving European research infrastructure
                        that will enable better, more comprehensive, and highly innovative comparative democracy
                        research by bringing together and linking data sources on the functioning of democracies.
                    </p>
                    <p>
                        We design PolPaL in such a way that its future integration into MEDem is possible, both on
                        a technical as well as on a conceptual level. By integrating PoLPaL into the MEDem
                        infrastructure, we increase PolPaL’s sustainability and FAIRness.
                    </p>
                    <ul className="space-y-2 text-xs text-gray-500">
                        <li className="flex items-center gap-2">
                            <a
                                href="https://www.medem.eu/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline hover:text-primary transition-colors"
                            >
                                https://www.medem.eu/
                            </a>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </li>
                    </ul>
                </div>
            </section>

            {/* Team Section */}
            <section className="bg-white rounded-xl shadow-md border border-gray-200 p-8 mb-8">
                <h2 className="text-2xl font-bold mb-4 text-primary">Team</h2>
                <div className="space-y-6">
                    <p className="text-justify">
                        PolPaL is developed and maintained by a team of researchers and data specialists dedicated to providing high-quality political data resources. Our team combines expertise in political science, data management, and software development to ensure that PolPaL meets the needs of the research community.
                    </p>

                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-primary mb-3">Team Members</h3>
                        <div className="overflow-x-auto">
                            {renderPersonTable(TableNameAboutEnum.member)}
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-primary mb-3">Student Assistants</h3>
                        <div className="overflow-x-auto">
                            {renderPersonTable(TableNameAboutEnum.student)}
                        </div>
                    </div>

                    <div className="bg-blue-50 border-l-4 border-primary p-4 rounded-r-lg">
                        <p className="text-sm">
                            For inquiries, contributions, or collaboration opportunities, please contact any of our team members directly.
                        </p>
                    </div>
                </div>
            </section>

            {/* Acknowledgements */}
            <section className="bg-white rounded-xl shadow-md border border-gray-200 p-8 mb-8">
                <h2 className="text-xl font-bold mb-4 text-primary">Acknowledgements</h2>
                <div className="space-y-4 text-justify">
                    <p>
                        We would like to thank a number of scholars who have supported the development and upkeep of PolPaL. Their expertise and dedication have been invaluable in establishing a valuable resource for the research community.
                    </p>

                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-primary mb-3">Contribution</h3>
                        <div className="overflow-x-auto">
                            {renderPersonTable(TableNameAboutEnum.contribution)}
                        </div>
                    </div>
                </div>
            </section>

            {/* Funding & Support Section */}
            <section className="bg-white rounded-xl shadow-md border border-gray-200 p-8 mb-8">
                <h2 className="text-xl font-bold mb-4 text-primary">Funding &amp; Support</h2>
                <div className="space-y-4 text-justify">

                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-primary mb-3">Grants</h3>
                        <div className="overflow-x-auto">
                            {renderGrantsTable()}
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-primary mb-3">Support</h3>
                        <div className="overflow-x-auto">
                            {renderSupportTable()}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
