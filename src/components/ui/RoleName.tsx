import { RoleEnum } from "@/lib/shared/enums";

export function RoleDisplay({ userRole, className = "", size = "md" }: { userRole: RoleEnum | string | undefined; className?: string; size?: "xs" | "sm" | "md" | "lg"; }) {

    // Get role display name
    const getRoleDisplay = (role: RoleEnum) => {
        const roleMap = {
            [RoleEnum.ADMIN]: 'Administrator',
            [RoleEnum.DATAMANAGER]: 'Data Manager',
            [RoleEnum.EDITOR]: 'Editor',
            [RoleEnum.CONTRIBUTOR]: 'Contributor',
            [RoleEnum.USER]: 'User',
            [RoleEnum.ROBOT]: 'Robot',
        };
        return roleMap[role] || role;
    };

    return (
        <span className={`${className} ${size === "xs" ? "text-xs" : size === "sm" ? "text-sm" : size === "lg" ? "text-lg" : "text-md"}`}>
            {userRole ? getRoleDisplay(userRole as RoleEnum) : '—'}
        </span>
    );
}