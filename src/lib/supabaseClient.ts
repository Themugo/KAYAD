// Mock Supabase client
export const supabase = {
  channel: () => ({
    on: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    subscribe: () => ({}),
    unsubscribe: () => {},
  }),
  removeChannel: () => {},
};
export type RealtimeChannel = ReturnType<typeof supabase.channel>;
