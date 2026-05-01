import OpenAI from 'openai';
import { logger } from './watcher';

const client = new OpenAI({
    baseURL: 'https://api.dgrid.ai/v1',
    apiKey: process.env.DGRID_API_KEY || ''
});

export async function generateRationale(evidence: any, label: string): Promise<string> {
    try {
        const prompt = [
            'You are a blockchain analytics system.',
            'Given the following wallet classification evidence, write a 1-2 sentence rationale explaining why this wallet was classified as ' + label + '.',
            'Evidence: ' + JSON.stringify(evidence),
            'Respond with ONLY the rationale, no preamble.'
        ].join('\n');

        const response = await client.chat.completions.create({
            model: 'deepseek/deepseek-chat',
            messages: [
                {
                    role: 'system',
                    content: prompt
                }
            ],
            max_tokens: 100,
            temperature: 0.1
        });

        return response.choices[0]?.message?.content?.trim() || '';
    } catch (error) {
        logger.error(error, 'LLM rationale generation failed');
        return '';
    }
}
