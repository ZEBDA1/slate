/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './media/slateChat.css';
import { $, addDisposableListener, append } from '../../../../base/browser/dom.js';
import { renderIcon } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IViewletViewOptions } from '../../../browser/parts/views/viewsViewlet.js';
import { IViewDescriptorService } from '../../../common/views.js';

/** Initial visual shell for the Slate chat. Conversation behavior lands in S2-03 and S2-04. */
export class SlateChatViewPane extends ViewPane {

	static readonly ID = 'workbench.view.slate.chat';

	constructor(
		options: IViewletViewOptions,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@IHoverService hoverService: IHoverService,
	) {
		super(
			options,
			keybindingService,
			contextMenuService,
			configurationService,
			contextKeyService,
			viewDescriptorService,
			instantiationService,
			openerService,
			themeService,
			hoverService,
		);
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);
		container.classList.add('slate-chat-view');

		const toolbar = append(container, $('.slate-chat-toolbar'));
		const toolbarTitle = append(toolbar, $('span.slate-chat-toolbar-title'));
		toolbarTitle.textContent = localize('slateChat.toolbarTitle', "Chat");
		this._createIconButton(toolbar, Codicon.add, localize('slateChat.newChat', "New Chat"));

		const scrollArea = append(container, $('.slate-chat-scroll'));
		const welcome = append(scrollArea, $('.slate-chat-welcome'));

		const mark = append(welcome, $('.slate-chat-mark'));
		mark.appendChild(renderIcon(Codicon.sparkle));

		const eyebrow = append(welcome, $('div.slate-chat-eyebrow'));
		eyebrow.textContent = localize('slateChat.eyebrow', "SLATE");

		const heading = append(welcome, $('h2.slate-chat-heading'));
		heading.textContent = localize('slateChat.heading', "What do you want to build?");

		const description = append(welcome, $('p.slate-chat-description'));
		description.textContent = localize(
			'slateChat.description',
			"Ask a question, plan a change, or start from the code in your workspace.",
		);

		const suggestions = append(welcome, $('.slate-chat-suggestions'));
		const composerInput = this._renderComposer(container);
		for (const suggestion of [
			localize('slateChat.suggestion.explain', "Explain this codebase"),
			localize('slateChat.suggestion.plan', "Plan a new feature"),
			localize('slateChat.suggestion.fix', "Find and fix a bug"),
			localize('slateChat.suggestion.improve', "Improve the active file"),
		]) {
			const button = append(suggestions, $<HTMLButtonElement>('button.slate-chat-suggestion'));
			button.type = 'button';
			button.textContent = suggestion;
			button.appendChild(renderIcon(Codicon.arrowRight));
			this._register(addDisposableListener(button, 'click', () => {
				composerInput.value = suggestion;
				composerInput.focus();
			}));
		}
	}

	private _renderComposer(container: HTMLElement): HTMLTextAreaElement {
		const composerRegion = append(container, $('.slate-chat-composer-region'));
		const composer = append(composerRegion, $('.slate-chat-composer'));
		const input = append(composer, $<HTMLTextAreaElement>('textarea.slate-chat-input'));
		input.rows = 1;
		input.placeholder = localize('slateChat.inputPlaceholder', "Ask Slate to build, explain, or fix…");
		input.setAttribute('aria-label', localize('slateChat.inputAriaLabel', "Chat message"));

		const composerToolbar = append(composer, $('.slate-chat-composer-toolbar'));
		const tools = append(composerToolbar, $('.slate-chat-composer-tools'));
		this._createIconButton(tools, Codicon.attach, localize('slateChat.attach', "Attach Context"));

		const contextButton = append(tools, $<HTMLButtonElement>('button.slate-chat-context-button'));
		contextButton.type = 'button';
		contextButton.textContent = '@';
		const contextLabel = append(contextButton, $('span'));
		contextLabel.textContent = localize('slateChat.addContext', "Context");

		const controls = append(composerToolbar, $('.slate-chat-composer-controls'));
		const modeButton = append(controls, $<HTMLButtonElement>('button.slate-chat-mode-button'));
		modeButton.type = 'button';
		modeButton.appendChild(renderIcon(Codicon.tools));
		const modeLabel = append(modeButton, $('span'));
		modeLabel.textContent = localize('slateChat.mode', "Agent");
		modeButton.appendChild(renderIcon(Codicon.chevronDown));

		const sendButton = this._createIconButton(controls, Codicon.arrowUp, localize('slateChat.send', "Send Message"));
		sendButton.classList.add('slate-chat-send-button');
		sendButton.disabled = true;
		sendButton.title = localize('slateChat.sendUnavailable', "Conversation service coming next");

		const preview = append(composerRegion, $('div.slate-chat-preview-label'));
		preview.textContent = localize('slateChat.preview', "Design preview · conversation service coming next");
		return input;
	}

	private _createIconButton(parent: HTMLElement, icon: ThemeIcon, label: string): HTMLButtonElement {
		const button = append(parent, $<HTMLButtonElement>('button.slate-chat-icon-button'));
		button.type = 'button';
		button.title = label;
		button.setAttribute('aria-label', label);
		button.appendChild(renderIcon(icon));
		return button;
	}
}
