/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Data model for the Slate chat conversation.
 *
 * This file is deliberately free of any model-provider concept: no Anthropic type, no
 * transport, no network. The provider boundary translates its own wire format into these
 * shapes, which is what allows a second provider to be added without touching the view or
 * the conversation service.
 */

/** Who authored a message. */
export type SlateChatRole = 'user' | 'assistant';

/**
 * Lifecycle of a message.
 *
 * A user message is `complete` as soon as it is created. An assistant message starts
 * `pending`, becomes `streaming` on its first delta, and settles into exactly one of
 * `complete`, `cancelled` or `failed`.
 */
export type SlateChatMessageState = 'pending' | 'streaming' | 'complete' | 'cancelled' | 'failed';

/** Prose authored by the user or streamed back from the model. */
export interface ISlateChatTextPart {
	readonly type: 'text';
	value: string;
}

/**
 * Summarized model reasoning. Kept separate from `text` so the view can render it in its own
 * collapsible region rather than inline with the answer.
 */
export interface ISlateChatReasoningPart {
	readonly type: 'reasoning';
	value: string;
}

/**
 * Workspace content attached to a user message, such as the active file or the current
 * selection. `label` is what the user sees; `value` is what is actually sent to the provider.
 * Both are held so the view can honor the product requirement that the user always sees what
 * leaves the machine.
 */
export interface ISlateChatAttachmentPart {
	readonly type: 'attachment';
	readonly uri: string;
	readonly label: string;
	readonly value: string;
}

/** Any addressable piece of a message. */
export type SlateChatPart = ISlateChatTextPart | ISlateChatReasoningPart | ISlateChatAttachmentPart;

/** A single turn in the conversation. */
export interface ISlateChatMessage {
	readonly id: string;
	readonly role: SlateChatRole;
	readonly parts: SlateChatPart[];
	state: SlateChatMessageState;
	/** Set only when `state` is `failed`; already localized, ready to render. */
	errorMessage?: string;
}

/** Terminal states: a message in one of these will never change again. */
const settledStates: readonly SlateChatMessageState[] = ['complete', 'cancelled', 'failed'];

/**
 * Whether a message has reached a terminal state.
 * @param message The message to inspect.
 */
export function isSettled(message: ISlateChatMessage): boolean {
	return settledStates.includes(message.state);
}

/**
 * Concatenates the text parts of a message, ignoring reasoning and attachments.
 *
 * Deltas arrive in fragments and are appended to the trailing text part, so a message can hold
 * several text parts; callers that want the answer as a single string use this.
 * @param message The message to read.
 */
export function getMessageText(message: ISlateChatMessage): string {
	let text = '';
	for (const part of message.parts) {
		if (part.type === 'text') {
			text += part.value;
		}
	}
	return text;
}

/**
 * Concatenates the reasoning parts of a message.
 * @param message The message to read.
 */
export function getMessageReasoning(message: ISlateChatMessage): string {
	let reasoning = '';
	for (const part of message.parts) {
		if (part.type === 'reasoning') {
			reasoning += part.value;
		}
	}
	return reasoning;
}

/**
 * Appends a text fragment to a message, extending the trailing text part when there is one.
 *
 * Merging rather than pushing keeps the part list from growing by one entry per token, which
 * matters because a long answer streams thousands of deltas.
 * @param message The message to mutate.
 * @param delta The fragment to append. Empty fragments are ignored.
 */
export function appendTextDelta(message: ISlateChatMessage, delta: string): void {
	if (!delta) {
		return;
	}
	const last = message.parts.at(-1);
	if (last?.type === 'text') {
		last.value += delta;
		return;
	}
	message.parts.push({ type: 'text', value: delta });
}

/**
 * Appends a reasoning fragment to a message, extending the trailing reasoning part when there
 * is one.
 * @param message The message to mutate.
 * @param delta The fragment to append. Empty fragments are ignored.
 */
export function appendReasoningDelta(message: ISlateChatMessage, delta: string): void {
	if (!delta) {
		return;
	}
	const last = message.parts.at(-1);
	if (last?.type === 'reasoning') {
		last.value += delta;
		return;
	}
	message.parts.push({ type: 'reasoning', value: delta });
}
