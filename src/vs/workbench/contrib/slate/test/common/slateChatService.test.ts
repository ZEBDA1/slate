/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ISlateChatMessage } from '../../common/slateChatModel.js';
import { SlateChatChangeEvent, SlateChatService } from '../../common/slateChatService.js';

suite('Slate Chat Service', () => {

	const store = ensureNoDisposablesAreLeakedInTestSuite();

	/**
	 * Builds a service with predictable identifiers so tests can assert on whole messages, and
	 * records every change event it fires.
	 */
	function createService(): { service: SlateChatService; events: SlateChatChangeEvent[] } {
		let next = 0;
		const service = store.add(new SlateChatService(() => `id-${++next}`));
		const events: SlateChatChangeEvent[] = [];
		store.add(service.onDidChangeMessages(e => events.push(e)));
		return { service, events };
	}

	/** The event stream reduced to what a test cares about: what happened, and to which message. */
	function summarize(events: readonly SlateChatChangeEvent[]): string[] {
		return events.map(e => e.kind === 'cleared' ? 'cleared' : `${e.kind}:${e.message.id}`);
	}

	test('a user message is complete on arrival and carries its attachments first', () => {
		const { service, events } = createService();

		const message = service.addUserMessage('Explain this function', [
			{ type: 'attachment', uri: 'file:///a.ts', label: 'a.ts', value: 'const a = 1;' },
		]);

		assert.deepStrictEqual({ message, events: summarize(events), history: service.messages.length }, {
			message: {
				id: 'id-1',
				role: 'user',
				parts: [
					{ type: 'attachment', uri: 'file:///a.ts', label: 'a.ts', value: 'const a = 1;' },
					{ type: 'text', value: 'Explain this function' },
				],
				state: 'complete',
			} satisfies ISlateChatMessage,
			events: ['added:id-1'],
			history: 1,
		});
	});

	test('deltas merge into single parts and settle as complete', () => {
		const { service, events } = createService();

		const assistant = service.addAssistantMessage();
		service.appendReasoning(assistant.id, 'Reading ');
		service.appendReasoning(assistant.id, 'the file.');
		service.appendText(assistant.id, 'It ');
		service.appendText(assistant.id, 'returns a number.');
		service.completeMessage(assistant.id);

		assert.deepStrictEqual({ message: assistant, events: summarize(events) }, {
			message: {
				id: 'id-1',
				role: 'assistant',
				parts: [
					{ type: 'reasoning', value: 'Reading the file.' },
					{ type: 'text', value: 'It returns a number.' },
				],
				state: 'complete',
			} satisfies ISlateChatMessage,
			events: ['added:id-1', 'updated:id-1', 'updated:id-1', 'updated:id-1', 'updated:id-1', 'updated:id-1'],
		});
	});

	test('a settled message ignores late deltas and further settling', () => {
		const { service, events } = createService();

		const assistant = service.addAssistantMessage();
		service.appendText(assistant.id, 'Partial');
		service.cancelMessage(assistant.id);

		// Everything below arrives after cancellation and must not change anything.
		service.appendText(assistant.id, ' more');
		service.appendReasoning(assistant.id, 'still thinking');
		service.completeMessage(assistant.id);
		service.failMessage(assistant.id, 'Request failed.');
		service.appendText('unknown-id', 'orphan');
		service.appendText(assistant.id, '');

		assert.deepStrictEqual({ message: assistant, events: summarize(events) }, {
			message: {
				id: 'id-1',
				role: 'assistant',
				parts: [{ type: 'text', value: 'Partial' }],
				state: 'cancelled',
			} satisfies ISlateChatMessage,
			events: ['added:id-1', 'updated:id-1', 'updated:id-1'],
		});
	});

	test('a failure carries its localized message', () => {
		const { service, events } = createService();

		const assistant = service.addAssistantMessage();
		service.failMessage(assistant.id, 'The API key was rejected.');

		assert.deepStrictEqual({ message: assistant, events: summarize(events) }, {
			message: {
				id: 'id-1',
				role: 'assistant',
				parts: [],
				state: 'failed',
				errorMessage: 'The API key was rejected.',
			} satisfies ISlateChatMessage,
			// A single update: the view never sees a `failed` message without its text.
			events: ['added:id-1', 'updated:id-1'],
		});
	});

	test('clearing empties the history once', () => {
		const { service, events } = createService();

		service.addUserMessage('Hello');
		service.addAssistantMessage();
		service.clear();
		service.clear(); // already empty: no second event

		assert.deepStrictEqual({ history: service.messages, events: summarize(events) }, {
			history: [],
			events: ['added:id-1', 'added:id-2', 'cleared'],
		});
	});

	test('identifiers stay usable after a clear', () => {
		const { service } = createService();

		service.addUserMessage('First');
		service.clear();
		const second = service.addUserMessage('Second');
		service.appendText(second.id, ' again');

		assert.deepStrictEqual(service.messages, [{
			id: 'id-2',
			role: 'user',
			parts: [{ type: 'text', value: 'Second' }],
			state: 'complete',
		} satisfies ISlateChatMessage]);
	});
});
