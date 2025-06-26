import { createClient } from '@sanity/client'

export const client = createClient({
  projectId: 'qevnvibt', // ← z `sanity.config.ts`
  dataset: 'production',
  useCdn: true,
  apiVersion: '2023-01-01',
})
