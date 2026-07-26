/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import {
	appendReasoningDelta,
	appendTextDelta,
	isSettled,
	ISlateChatAttachmentPart,
	ISlateChatMessage,
	SlateChatPart,
} from './slateChatModel.js';

/**
 * What changed in the conversation.
 *
 * The view redraws a single message on `updated` rather than the whole list, which is what keeps
 * a long answer from re-rendering thousands of times while it streams.
 */
export type SlateChatChangeEvent =
	| { readonly kind: 'added'; readonly message: ISlateChatMessage }
	| { readonly kind: 'updated'; readonly message: ISlateChatMessage }
	| { readonly kind: 'cleared' };

export const ISlateChatService = createDecorator<ISlateChatService>('slateChatService');

/**
 * Holds the conversation for the current window and is the only writer of its messages.
 *
 * This service knows nothing about models, networks or providers: it owns history and state
 * transitions. The provider client added in S2-06 drives it by calling the mutation methods as
 * stream events arrive.
 */
export interface ISlateChatService {
	readonly _serviceBrand: undefined;

	/** The conversation, oldest first. Callers must not mutate the returned array. */
	readonly messages: readonly ISlateChatMessage[];

	readonly onDidChangeMessages: Event<SlateChatChangeEvent>;

	/**
	 * Appends a completed user turn.
	 * @param text What the user typed.
	 * @param attachments Workspace content joined to the turn, in the order it will be sent.
	 */
	addUserMessage(text: string, attachments?: readonly ISlateChatAttachmentPart[]): ISlateChatMessage;

	/** Appends an empty assistant turn in the `pending` state, awaiting deltas. */
	addAssistantMessage(): ISlateChatMessage;

	/**
	 * Appends a text fragment to a message and moves it to `streaming`.
	 *
	 * Unknown identifiers and settled messages are ignored rather than throwing: a delta can
	 * still be in flight when the user cancels.
	 */
	appendText(messageId: string, delta: string): void;

	/** Appends a summarized-reasoning fragment. Same tolerance as {@link appendText}. */
	appendReasoning(messageId: string, delta: string): void;

	/** Settles a message as `complete`. */
	completeMessage(messageId: string): void;

	/** Settles a message as `cancelled`. */
	cancelMessage(messageId: string): void;

	/**
	 * Settles a message as `failed`.
	 * @param errorMessage Already localized; rendered as-is in the conversation.
	 */
	failMessage(messageId: string, errorMessage: string): void;

	/** Drops the whole conversation. */
	clear(): void;
}

export class SlateChatService extends Disposable implements ISlateChatService {

	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeMessages = this._register(new Emitter<SlateChatChangeEvent>());
	readonly onDidChangeMessages = this._onDidChangeMessages.event;

	private readonly _messages: ISlateChatMessage[] = [];
	private readonly _byId = new Map<string, ISlateChatMessage>();

	/**
	 * @param _generateId Injected so tests can assert on whole messages instead of skipping their
	 * identifiers. Defaults to the real generator.
	 */
	constructor(private readonly _generateId: () => string = generateUuid) {
		super();
	}

	get messages(): readonly ISlateChatMessage[] {
		return this._messages;
	}

	addUserMessage(text: string, attachments: readonly ISlateChatAttachmentPart[] = []): ISlateChatMessage {
		const parts: SlateChatPart[] = [...attachments];
		if (text) {
			parts.push({ type: 'text', value: text });
		}
		return this._add({ id: this._generateId(), role: 'user', parts, state: 'complete' });
	}

	addAssistantMessage(): ISlateChatMessage {
		return this._add({ id: this._generateId(), role: 'assistant', parts: [], state: 'pending' });
	}

	appendText(messageId: string, delta: string): void {
		this._stream(messageId, delta, appendTextDelta);
	}

	appendReasoning(messageId: string, delta: string): void {
		this._stream(messageId, delta, appendReasoningDelta);
	}

	completeMessage(messageId: string): void {
		this._settle(messageId, 'complete');
	}

	cancelMessage(messageId: string): void {
		this._settle(messageId, 'cancelled');
	}

	failMessage(messageId: string, errorMessage: string): void {
		this._settle(messageId, 'failed', errorMessage);
	}

	clear(): void {
		if (this._messages.length === 0) {
			return;
		}
		this._messages.length = 0;
		this._byId.clear();
		this._onDidChangeMessages.fire({ kind: 'cleared' });
	}

	private _add(message: ISlateChatMessage): ISlateChatMessage {
		this._messages.push(message);
		this._byId.set(message.id, message);
		this._onDidChangeMessages.fire({ kind: 'added', message });
		return message;
	}

	/**
	 * Applies a delta and reports it.
	 *
	 * Three cases produce no event at all: an unknown identifier, an already settled message, and
	 * an empty delta. The first two are expected — a delta can still be in flight when the user
	 * cancels — and the third spares the view a redraw that would change nothing.
	 */
	private _stream(messageId: string, delta: string, apply: (message: ISlateChatMessage, delta: string) => void): void {
		const message = this._byId.get(messageId);
		if (!message || isSettled(message) || !delta) {
			return;
		}
		apply(message, delta);
		message.state = 'streaming';
		this._onDidChangeMessages.fire({ kind: 'updated', message });
	}

	/**
	 * Moves a message to a terminal state and reports it once.
	 *
	 * The error message is set before the event fires, so a view that renders a `failed` message
	 * always has the text to show. Firing twice would also redraw twice for a single failure.
	 */
	private _settle(messageId: string, state: 'complete' | 'cancelled' | 'failed', errorMessage?: string): void {
		const message = this._byId.get(messageId);
		if (!message || isSettled(message)) {
			return;
		}
		message.state = state;
		if (errorMessage !== undefined) {
			message.errorMessage = errorMessage;
		}
		this._onDidChangeMessages.fire({ kind: 'updated', message });
	}
}
