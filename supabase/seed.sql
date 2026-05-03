-- Seed data for local development
-- This file is run after migrations during `supabase db reset`

-- Create a test user in auth.users (local dev only)
-- Note: In local Supabase, we can insert directly into auth.users
-- All string columns must have non-null values for GoTrue to work
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Test User"}',
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- Also create the identity record for email provider
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'test@example.com',
  'email',
  '{"sub": "00000000-0000-0000-0000-000000000001", "email": "test@example.com"}',
  now(),
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- The trigger should auto-create the profile, but let's ensure it exists
INSERT INTO public.profiles (id, email, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'test@example.com', 'Test User')
ON CONFLICT (id) DO NOTHING;

-- Create sample folders
INSERT INTO public.folders (id, user_id, name) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Research'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Work'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Personal')
ON CONFLICT (id) DO NOTHING;

-- Create sample sources (bookmarks)
INSERT INTO public.sources (id, user_id, folder_id, url, title, type, page_metadata) VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'https://arxiv.org/abs/2303.08774',
    'GPT-4 Technical Report',
    'bookmark',
    '{"description": "OpenAI GPT-4 technical report describing the model architecture and capabilities"}'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'https://www.anthropic.com/research/claude-3-opus',
    'Claude 3 Opus Overview',
    'bookmark',
    '{"description": "Anthropic Claude 3 Opus model capabilities and benchmarks"}'
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    'https://docs.github.com/en/actions',
    'GitHub Actions Documentation',
    'bookmark',
    '{"description": "Official GitHub Actions documentation for CI/CD workflows"}'
  )
ON CONFLICT (id) DO NOTHING;

-- Create sample highlights
INSERT INTO public.highlights (id, user_id, source_id, content) VALUES
  (
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'GPT-4 is a large multimodal model capable of processing image and text inputs and producing text outputs.'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    'Claude 3 Opus demonstrates near-human level performance on complex reasoning tasks.'
  )
ON CONFLICT (id) DO NOTHING;

-- Create a sample chat
INSERT INTO public.chats (id, user_id, title) VALUES
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Research Discussion')
ON CONFLICT (id) DO NOTHING;

-- Create sample messages
INSERT INTO public.messages (id, chat_id, user_id, role, content) VALUES
  (
    '50000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'user',
    'What are the key differences between GPT-4 and Claude 3?'
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'assistant',
    'Based on your saved sources, GPT-4 is described as a large multimodal model, while Claude 3 Opus focuses on complex reasoning tasks with near-human performance.'
  )
ON CONFLICT (id) DO NOTHING;
