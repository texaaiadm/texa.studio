// User Tools Service - Check individual tool access
import { supabase } from './supabaseService';

export interface UserToolAccess {
    user_id: string;
    tool_id: string;
    access_end: string;
    order_ref_id?: string;
    created_at: string;
}

// Check if user has active individual access to a specific tool
export const hasIndividualToolAccess = async (userId: string, toolId: string): Promise<boolean> => {
    console.log('[hasIndividualToolAccess] Checking access for:', { userId, toolId });

    try {
        const { data, error } = await supabase
            .from('user_tools')
            .select('access_end')
            .eq('user_id', userId)
            .eq('tool_id', toolId)
            .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 results

        console.log('[hasIndividualToolAccess] Query result:', { data, error });

        if (error) {
            console.error('[hasIndividualToolAccess] Supabase error:', error);
            return false;
        }

        if (!data) {
            console.log('[hasIndividualToolAccess] No access record found');
            return false;
        }

        // Check if access is still valid
        const accessEnd = new Date(data.access_end);
        const now = new Date();
        const hasAccess = accessEnd > now;

        console.log('[hasIndividualToolAccess] Access check:', {
            accessEnd: accessEnd.toISOString(),
            now: now.toISOString(),
            hasAccess
        });

        return hasAccess;
    } catch (error) {
        console.error('[hasIndividualToolAccess] Exception:', error);
        return false;
    }
};

// Get all active tool accesses for a user - uses API endpoint to bypass RLS
export const getUserToolAccesses = async (userId: string): Promise<UserToolAccess[]> => {
    try {
        // Use API endpoint which has service role key to bypass RLS
        const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const apiBaseUrl = isDev ? 'http://127.0.0.1:8788' : '';

        const response = await fetch(`${apiBaseUrl}/api/public/user-tools?userId=${userId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                console.log('[userToolsService] Got', result.data.length, 'active tools for user');
                return result.data as UserToolAccess[];
            }
        }

        console.warn('[userToolsService] API call failed, falling back to direct Supabase');
        // Fallback to direct Supabase (may fail due to RLS)
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('user_tools')
            .select('*')
            .eq('user_id', userId)
            .gt('access_end', now);

        if (error) {
            console.error('Error getting user tool accesses:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error getting user tool accesses:', error);
        return [];
    }
};

// Check if user can access a tool (either via subscription or individual purchase)
// UPDATED: Now checks user_tools table for BOTH subscription package tools and individual purchases
// Subscription packages now store their included tools in user_tools on payment success
export const canAccessTool = async (
    user: { id: string; subscriptionEnd?: string } | null,
    toolId: string
): Promise<boolean> => {
    console.log('[canAccessTool] Checking access...', { userId: user?.id, toolId });

    if (!user) {
        console.log('[canAccessTool] No user, denying access');
        return false;
    }

    try {
        // Use API endpoint (bypasses RLS) to get all user's active tools
        const userTools = await getUserToolAccesses(user.id);
        console.log('[canAccessTool] Got user tools:', userTools.length);

        // Check if this specific tool is in the user's active tools
        const hasAccess = userTools.some(t => t.tool_id === toolId);
        console.log('[canAccessTool] Access check result:', hasAccess);

        return hasAccess;
    } catch (error) {
        console.error('[canAccessTool] Error:', error);
        return false;
    }
};
