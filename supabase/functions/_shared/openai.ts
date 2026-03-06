import OpenAI from 'https://esm.sh/openai@4'

export const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
})
