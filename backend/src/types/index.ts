/**
 * Plugin Types
 *
 * CUSTOMIZE: Add your plugin's type definitions here.
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  tier: 'free' | 'starter' | 'professional' | 'enterprise' | 'studio';
  subscription_status?: 'active' | 'trialing' | 'past_due' | 'canceled';
  trial_end?: string;
  trial_days_remaining?: number;
  created_at: Date;
  updated_at: Date;
}

// CUSTOMIZE: Add your plugin-specific types below

export interface PluginEntity {
  id: string;
  user_id: string;
  name: string;
  status: 'active' | 'archived' | 'draft';
  created_at: Date;
  updated_at: Date;
}
