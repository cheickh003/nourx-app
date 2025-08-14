'use client';

import { useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseRealtimeOptions {
  table: string;
  filter?: string;
  onInsert?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  onUpdate?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  enabled?: boolean;
}

export function useRealtime({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true
}: UseRealtimeOptions) {
  const supabase = createClientComponentClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Créer un canal stable par source
    const channelName = `realtime-${table}-${filter || 'all'}`;
    const channel = supabase.channel(channelName);

    // Configuration de l'abonnement
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: table,
        ...(filter && { filter })
      },
      (payload) => {
        console.log(`Realtime change on ${table}:`, payload);
        
        switch (payload.eventType) {
          case 'INSERT':
            if (onInsert) onInsert(payload);
            break;
          case 'UPDATE':
            if (onUpdate) onUpdate(payload);
            break;
          case 'DELETE':
            if (onDelete) onDelete(payload);
            break;
        }
      }
    );

    // S'abonner
    channel.subscribe((status) => {
      console.log(`Realtime subscription status for ${table}:`, status);
    });

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, filter, onInsert, onUpdate, onDelete, enabled, supabase]);

  // Fonction pour se désabonner manuellement
  const unsubscribe = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  return { unsubscribe };
}

// Hook spécialisé pour les tâches d'un projet
export function useTasksRealtime(
  projectId: string,
  onTaskChange?: () => void,
  enabled = true
) {
  return useRealtime({
    table: 'tasks',
    filter: `project_id=eq.${projectId}`,
    onInsert: onTaskChange,
    onUpdate: onTaskChange,
    onDelete: onTaskChange,
    enabled
  });
}

// Hook spécialisé pour les commentaires d'une tâche
export function useTaskCommentsRealtime(
  taskId: string,
  onCommentChange?: () => void,
  enabled = true
) {
  return useRealtime({
    table: 'task_comments',
    filter: `task_id=eq.${taskId}`,
    onInsert: onCommentChange,
    onUpdate: onCommentChange,
    onDelete: onCommentChange,
    enabled
  });
}

// Hook spécialisé pour les jalons d'un projet
export function useMilestonesRealtime(
  projectId: string,
  onMilestoneChange?: () => void,
  enabled = true
) {
  return useRealtime({
    table: 'milestones',
    filter: `project_id=eq.${projectId}`,
    onInsert: onMilestoneChange,
    onUpdate: onMilestoneChange,
    onDelete: onMilestoneChange,
    enabled
  });
}

// Hook spécialisé pour les documents d'un projet
export function useDocumentsRealtime(
  projectId: string,
  onDocumentChange?: () => void,
  enabled = true
) {
  return useRealtime({
    table: 'documents',
    filter: `project_id=eq.${projectId}`,
    onInsert: onDocumentChange,
    onUpdate: onDocumentChange,
    onDelete: onDocumentChange,
    enabled
  });
}

// Hook spécialisé pour les tickets d'un client/projet
export function useTicketsRealtime(
  projectOrClientFilter: { projectId?: string; clientId?: string },
  onTicketChange?: () => void,
  enabled = true
) {
  const filter = projectOrClientFilter.projectId
    ? `project_id=eq.${projectOrClientFilter.projectId}`
    : projectOrClientFilter.clientId
    ? `client_id=eq.${projectOrClientFilter.clientId}`
    : undefined

  return useRealtime({
    table: 'tickets',
    filter,
    onInsert: onTicketChange,
    onUpdate: onTicketChange,
    onDelete: onTicketChange,
    enabled,
  })
}

// Hook spécialisé pour les messages d'un ticket
export function useTicketMessagesRealtime(
  ticketId: string,
  onMessageChange?: () => void,
  enabled = true
) {
  return useRealtime({
    table: 'ticket_messages',
    filter: `ticket_id=eq.${ticketId}`,
    onInsert: onMessageChange,
    onUpdate: onMessageChange,
    onDelete: onMessageChange,
    enabled,
  })
}

// Hook pour les canaux broadcast (messages temps réel)
interface UseBroadcastOptions {
  channel: string;
  onMessage?: (payload: Record<string, unknown>) => void;
  enabled?: boolean;
}

export function useBroadcast({
  channel,
  onMessage,
  enabled = true
}: UseBroadcastOptions) {
  const supabase = createClientComponentClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const realtimeChannel = supabase.channel(channel);

    realtimeChannel
      .on('broadcast', { event: 'message' }, (payload) => {
        if (onMessage) onMessage(payload);
      })
      .subscribe((status) => {
        console.log(`Broadcast subscription status for ${channel}:`, status);
      });

    channelRef.current = realtimeChannel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channel, onMessage, enabled, supabase]);

  // Fonction pour envoyer un message
  const sendMessage = (message: Record<string, unknown>) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'message',
        payload: message
      });
    }
  };

  const unsubscribe = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  return { sendMessage, unsubscribe };
}

// Hook pour les notifications de typing (optionnel)
export function useTypingIndicator(
  projectId: string,
  userId: string,
  enabled = true
) {
  const { sendMessage } = useBroadcast({
    channel: `project:${projectId}:typing`,
    enabled
  });

  const sendTypingStart = (context: string) => {
    sendMessage({
      type: 'typing_start',
      user_id: userId,
      context,
      timestamp: Date.now()
    });
  };

  const sendTypingStop = (context: string) => {
    sendMessage({
      type: 'typing_stop',
      user_id: userId,
      context,
      timestamp: Date.now()
    });
  };

  return { sendTypingStart, sendTypingStop };
}
