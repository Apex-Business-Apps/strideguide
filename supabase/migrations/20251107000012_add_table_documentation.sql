-- Comprehensive Table and Column Documentation
-- Adds detailed comments to all tables and important columns

-- profiles table
COMMENT ON TABLE public.profiles IS 'User profiles with personal information, preferences, and accessibility settings. One-to-one with auth.users.';
COMMENT ON COLUMN public.profiles.id IS 'Primary key, references auth.users(id)';
COMMENT ON COLUMN public.profiles.email IS 'User email address. Must be unique and not null. Validated on insert/update.';
COMMENT ON COLUMN public.profiles.full_name IS 'User full name for display purposes';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to user avatar image';
COMMENT ON COLUMN public.profiles.phone_number IS 'User phone number in E.164 format (e.g., +16135551234)';
COMMENT ON COLUMN public.profiles.postal_code IS 'Canadian postal code (e.g., K1A 0B1) for location-based services';
COMMENT ON COLUMN public.profiles.timezone IS 'IANA timezone (e.g., America/Toronto). Validated against pg_timezone_names.';
COMMENT ON COLUMN public.profiles.deleted_at IS 'Soft delete timestamp. NULL means active, non-NULL means deleted.';

-- organizations table
COMMENT ON TABLE public.organizations IS 'Multi-tenant organizations for team/enterprise accounts';
COMMENT ON COLUMN public.organizations.id IS 'Primary key';
COMMENT ON COLUMN public.organizations.name IS 'Organization display name';
COMMENT ON COLUMN public.organizations.slug IS 'Unique URL-safe identifier for organization';
COMMENT ON COLUMN public.organizations.owner_id IS 'User who owns/created the organization. References auth.users(id).';
COMMENT ON COLUMN public.organizations.subscription_id IS 'Active subscription for this organization';
COMMENT ON COLUMN public.organizations.settings IS 'JSONB settings object for organization preferences';
COMMENT ON COLUMN public.organizations.deleted_at IS 'Soft delete timestamp';

-- user_roles table
COMMENT ON TABLE public.user_roles IS 'User roles within organizations for access control';
COMMENT ON COLUMN public.user_roles.user_id IS 'User ID, references auth.users(id)';
COMMENT ON COLUMN public.user_roles.organization_id IS 'Organization ID';
COMMENT ON COLUMN public.user_roles.role IS 'Role name: user, admin, super-admin, or owner';

-- subscription_plans table
COMMENT ON TABLE public.subscription_plans IS 'Available subscription tiers and pricing';
COMMENT ON COLUMN public.subscription_plans.name IS 'Plan name (Basic, Premium, Enterprise)';
COMMENT ON COLUMN public.subscription_plans.price_monthly IS 'Monthly price in USD';
COMMENT ON COLUMN public.subscription_plans.price_yearly IS 'Yearly price in USD (discounted)';
COMMENT ON COLUMN public.subscription_plans.stripe_price_id IS 'Stripe Price ID for monthly billing';
COMMENT ON COLUMN public.subscription_plans.stripe_yearly_price_id IS 'Stripe Price ID for yearly billing';
COMMENT ON COLUMN public.subscription_plans.features IS 'JSONB array of feature names included in plan';
COMMENT ON COLUMN public.subscription_plans.max_api_calls IS 'Maximum API calls per month. -1 means unlimited.';
COMMENT ON COLUMN public.subscription_plans.max_users IS 'Maximum users per organization. -1 means unlimited.';

-- user_subscriptions table
COMMENT ON TABLE public.user_subscriptions IS 'Active user subscriptions linked to Stripe';
COMMENT ON COLUMN public.user_subscriptions.user_id IS 'Subscriber user ID';
COMMENT ON COLUMN public.user_subscriptions.plan_id IS 'Subscription plan ID';
COMMENT ON COLUMN public.user_subscriptions.stripe_customer_id IS 'Stripe Customer ID (cus_xxx). Must be unique.';
COMMENT ON COLUMN public.user_subscriptions.stripe_subscription_id IS 'Stripe Subscription ID (sub_xxx). Must be unique.';
COMMENT ON COLUMN public.user_subscriptions.status IS 'Subscription status: active, canceled, past_due, etc.';
COMMENT ON COLUMN public.user_subscriptions.current_period_start IS 'Current billing period start date';
COMMENT ON COLUMN public.user_subscriptions.current_period_end IS 'Current billing period end date';
COMMENT ON COLUMN public.user_subscriptions.trial_end IS 'Trial period end date if applicable';
COMMENT ON COLUMN public.user_subscriptions.cancel_at_period_end IS 'If true, subscription will cancel at period end';
COMMENT ON COLUMN public.user_subscriptions.deleted_at IS 'Soft delete timestamp';

-- billing_events table
COMMENT ON TABLE public.billing_events IS 'Audit log of billing-related events from Stripe webhooks';
COMMENT ON COLUMN public.billing_events.user_id IS 'User associated with billing event';
COMMENT ON COLUMN public.billing_events.subscription_id IS 'Subscription ID if applicable';
COMMENT ON COLUMN public.billing_events.event_type IS 'Stripe event type (e.g., invoice.paid, charge.succeeded)';
COMMENT ON COLUMN public.billing_events.stripe_event_id IS 'Stripe Event ID for idempotency';
COMMENT ON COLUMN public.billing_events.amount IS 'Amount in USD';
COMMENT ON COLUMN public.billing_events.currency IS 'Currency code (default: usd)';
COMMENT ON COLUMN public.billing_events.status IS 'Event status: succeeded, failed, pending';
COMMENT ON COLUMN public.billing_events.metadata IS 'Additional event metadata as JSONB';

-- emergency_contacts table
COMMENT ON TABLE public.emergency_contacts IS 'Emergency contacts for SOS functionality';
COMMENT ON COLUMN public.emergency_contacts.user_id IS 'User who owns this contact';
COMMENT ON COLUMN public.emergency_contacts.name IS 'Contact full name';
COMMENT ON COLUMN public.emergency_contacts.phone_number IS 'Contact phone number in E.164 format';
COMMENT ON COLUMN public.emergency_contacts.email IS 'Contact email address (optional)';
COMMENT ON COLUMN public.emergency_contacts.relationship IS 'Relationship to user (e.g., spouse, parent, friend)';
COMMENT ON COLUMN public.emergency_contacts.is_primary IS 'If true, this is the primary emergency contact. Only one per user.';
COMMENT ON COLUMN public.emergency_contacts.deleted_at IS 'Soft delete timestamp';

-- lost_items table
COMMENT ON TABLE public.lost_items IS 'User-defined lost items for ML-based search';
COMMENT ON COLUMN public.lost_items.user_id IS 'User who lost the item';
COMMENT ON COLUMN public.lost_items.name IS 'Item name/description';
COMMENT ON COLUMN public.lost_items.description IS 'Detailed description of item';
COMMENT ON COLUMN public.lost_items.image_url IS 'Reference image URL for visual search';
COMMENT ON COLUMN public.lost_items.embedding IS 'ML embedding vector for similarity search. Max 1MB.';
COMMENT ON COLUMN public.lost_items.embedding_model IS 'Model used to generate embedding (e.g., all-MiniLM-L6-v2)';
COMMENT ON COLUMN public.lost_items.last_seen_location IS 'Last known location description';
COMMENT ON COLUMN public.lost_items.status IS 'Item status: active, found, archived';
COMMENT ON COLUMN public.lost_items.deleted_at IS 'Soft delete timestamp';

-- feature_flags table
COMMENT ON TABLE public.feature_flags IS 'Feature flags for gradual rollout and A/B testing';
COMMENT ON COLUMN public.feature_flags.name IS 'Unique feature flag name';
COMMENT ON COLUMN public.feature_flags.description IS 'Human-readable description of feature';
COMMENT ON COLUMN public.feature_flags.is_enabled IS 'If true, feature is enabled globally';
COMMENT ON COLUMN public.feature_flags.required_plan_level IS 'Minimum plan level required (1=Basic, 2=Premium, 3=Enterprise)';

-- api_usage table
COMMENT ON TABLE public.api_usage IS 'API usage tracking for rate limiting and analytics';
COMMENT ON COLUMN public.api_usage.user_id IS 'User who made the API call';
COMMENT ON COLUMN public.api_usage.organization_id IS 'Organization context if applicable';
COMMENT ON COLUMN public.api_usage.endpoint IS 'API endpoint called';
COMMENT ON COLUMN public.api_usage.method IS 'HTTP method (GET, POST, etc.)';
COMMENT ON COLUMN public.api_usage.status_code IS 'HTTP response status code';
COMMENT ON COLUMN public.api_usage.response_time_ms IS 'Response time in milliseconds';
COMMENT ON COLUMN public.api_usage.request_size_bytes IS 'Request body size in bytes';
COMMENT ON COLUMN public.api_usage.response_size_bytes IS 'Response body size in bytes';

-- audit_log table
COMMENT ON TABLE public.audit_log IS 'Comprehensive audit trail of all important actions';
COMMENT ON COLUMN public.audit_log.event_type IS 'Type of event (e.g., user_login, data_update, admin_action)';
COMMENT ON COLUMN public.audit_log.table_name IS 'Database table affected';
COMMENT ON COLUMN public.audit_log.record_id IS 'ID of affected record';
COMMENT ON COLUMN public.audit_log.user_id IS 'User who performed the action';
COMMENT ON COLUMN public.audit_log.changes IS 'JSONB object with before/after values';
COMMENT ON COLUMN public.audit_log.ip_address IS 'IP address of request';
COMMENT ON COLUMN public.audit_log.user_agent IS 'Browser user agent string';

-- rate_limit_attempts table
COMMENT ON TABLE public.rate_limit_attempts IS 'Rate limiting tracking using sliding window algorithm';
COMMENT ON COLUMN public.rate_limit_attempts.identifier IS 'IP address or user ID (format: ip:xxx or user:uuid)';
COMMENT ON COLUMN public.rate_limit_attempts.endpoint IS 'Endpoint being rate limited (e.g., auth/login)';
COMMENT ON COLUMN public.rate_limit_attempts.attempt_count IS 'Number of attempts in current window';
COMMENT ON COLUMN public.rate_limit_attempts.window_start IS 'Start of rate limit window';
COMMENT ON COLUMN public.rate_limit_attempts.last_attempt IS 'Timestamp of most recent attempt';

-- failed_login_attempts table
COMMENT ON TABLE public.failed_login_attempts IS 'Failed login tracking for account lockout';
COMMENT ON COLUMN public.failed_login_attempts.identifier IS 'Email or IP address';
COMMENT ON COLUMN public.failed_login_attempts.identifier_type IS 'Type: email or ip';
COMMENT ON COLUMN public.failed_login_attempts.attempt_count IS 'Total failed attempts';
COMMENT ON COLUMN public.failed_login_attempts.first_attempt_at IS 'Timestamp of first failure';
COMMENT ON COLUMN public.failed_login_attempts.last_attempt_at IS 'Timestamp of most recent failure';
COMMENT ON COLUMN public.failed_login_attempts.locked_until IS 'NULL if not locked, otherwise timestamp when lock expires';
COMMENT ON COLUMN public.failed_login_attempts.lockout_reason IS 'Reason for lockout (e.g., "Too many failed login attempts")';

-- spend_alerts table
COMMENT ON TABLE public.spend_alerts IS 'User-configured spending alert thresholds';
COMMENT ON COLUMN public.spend_alerts.user_id IS 'User who owns this alert';
COMMENT ON COLUMN public.spend_alerts.alert_type IS 'Alert period: daily, monthly, or total';
COMMENT ON COLUMN public.spend_alerts.threshold_amount IS 'Dollar amount threshold in USD';
COMMENT ON COLUMN public.spend_alerts.current_amount IS 'Current spending in period';
COMMENT ON COLUMN public.spend_alerts.alert_percentage IS 'Trigger alert at X% of threshold (default 80)';
COMMENT ON COLUMN public.spend_alerts.last_alert_sent_at IS 'Timestamp of last alert sent (prevents spam)';
COMMENT ON COLUMN public.spend_alerts.is_active IS 'If false, alert is disabled';

-- spend_alert_notifications table
COMMENT ON TABLE public.spend_alert_notifications IS 'History of triggered spending alerts';
COMMENT ON COLUMN public.spend_alert_notifications.alert_id IS 'Alert configuration that triggered';
COMMENT ON COLUMN public.spend_alert_notifications.percentage_used IS 'Percentage of threshold used when triggered';
COMMENT ON COLUMN public.spend_alert_notifications.message IS 'Human-readable alert message';
COMMENT ON COLUMN public.spend_alert_notifications.is_critical IS 'True if threshold exceeded (100%+)';

-- cost_tracking table
COMMENT ON TABLE public.cost_tracking IS 'Detailed tracking of API costs by service';
COMMENT ON COLUMN public.cost_tracking.service IS 'Service name: openai, stripe, supabase, other';
COMMENT ON COLUMN public.cost_tracking.operation IS 'Specific operation (e.g., chat.completions, embeddings)';
COMMENT ON COLUMN public.cost_tracking.tokens_used IS 'Number of tokens consumed (for OpenAI)';
COMMENT ON COLUMN public.cost_tracking.cost_usd IS 'Cost in USD (decimal, 6 places for precision)';
COMMENT ON COLUMN public.cost_tracking.metadata IS 'Additional context as JSONB';

-- user_token_budgets table
COMMENT ON TABLE public.user_token_budgets IS 'Daily and monthly token budget limits per user';
COMMENT ON COLUMN public.user_token_budgets.user_id IS 'User ID';
COMMENT ON COLUMN public.user_token_budgets.daily_limit IS 'Maximum tokens per day (default 10,000)';
COMMENT ON COLUMN public.user_token_budgets.monthly_limit IS 'Maximum tokens per month (default 300,000)';
COMMENT ON COLUMN public.user_token_budgets.daily_used IS 'Tokens used today';
COMMENT ON COLUMN public.user_token_budgets.monthly_used IS 'Tokens used this month';
COMMENT ON COLUMN public.user_token_budgets.last_daily_reset IS 'Last time daily counter was reset';
COMMENT ON COLUMN public.user_token_budgets.last_monthly_reset IS 'Last time monthly counter was reset';

-- Add comments for important functions
COMMENT ON FUNCTION public.is_admin IS 'Returns true if user has admin, super-admin, or owner role';
COMMENT ON FUNCTION public.is_org_admin IS 'Returns true if user is admin of specific organization';
COMMENT ON FUNCTION public.is_org_member IS 'Returns true if user is member of specific organization';
COMMENT ON FUNCTION public.check_token_budget IS 'Checks if user has sufficient token budget for operation';
COMMENT ON FUNCTION public.increment_token_usage IS 'Increments user token usage counters';
COMMENT ON FUNCTION public.check_rate_limit IS 'Checks rate limit using sliding window algorithm';
COMMENT ON FUNCTION public.record_failed_login IS 'Records failed login and applies progressive lockout';
COMMENT ON FUNCTION public.is_account_locked IS 'Checks if account/IP is currently locked out';
COMMENT ON FUNCTION public.track_cost_and_check_alerts IS 'Records API cost and checks if spending alerts should trigger';
COMMENT ON FUNCTION public.get_spending_summary IS 'Returns spending summary (daily, weekly, monthly, total)';
COMMENT ON FUNCTION public.soft_delete IS 'Soft deletes record by setting deleted_at timestamp';
COMMENT ON FUNCTION public.restore_soft_deleted IS 'Restores soft-deleted record';
COMMENT ON FUNCTION public.hard_delete_expired IS 'Permanently deletes soft-deleted records older than X days';
