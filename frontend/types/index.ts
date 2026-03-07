/**
 * Gemeinsame TypeScript-Typen für das Frontend
 */

export enum Permission {
    VIEW_TOOLS = 'VIEW_TOOLS',
    USE_TOOLS = 'USE_TOOLS',
    CREATE_TOOLS = 'CREATE_TOOLS',
    EDIT_TOOLS = 'EDIT_TOOLS',
    DELETE_TOOLS = 'DELETE_TOOLS',
    MANAGE_USERS = 'MANAGE_USERS',
}

export type ToolType = 'EXTERNAL_LINK' | 'HTML_FILE';
export type ToolVisibility = 'PUBLIC' | 'ROLE_BASED' | 'USER_BASED';

export interface Tool {
    id: string;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    type: ToolType;
    url?: string;
    visibility: ToolVisibility;
    isActive: boolean;
    isLocked: boolean;
    isRestricted?: boolean; // Neu: Falls der User das Tool nicht öffnen darf
    sortOrder: number;
    roleAccess?: { toolId: string; roleId: string }[];
    userAccess?: { toolId: string; userId: string }[];
    createdAt: string;
    updatedAt: string;
}

export interface Role {
    id: string;
    name: string;
    description?: string;
    permissions: Permission[];
    createdAt: string;
}

export interface User {
    id: string;
    username: string;
    email: string;
    isAdmin: boolean;
    isActive: boolean;
    requirePasswordChange: boolean;
    role?: Role | null;
    roleId?: string | null;
    userPermissions: { permission: Permission }[];
    toolAccess?: string[]; // Neu: IDs der direkt zugewiesenen Tools
    createdAt: string;
}
