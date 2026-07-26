/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './media/slateWorkbench.css';
import { Codicon } from '../../../../base/common/codicons.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ConfigurationTarget, IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import {
	Extensions as ConfigurationExtensions,
	IConfigurationRegistry,
} from '../../../../platform/configuration/common/configurationRegistry.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import {
	Extensions as ViewContainerExtensions,
	IViewContainersRegistry,
	IViewDescriptor,
	IViewsRegistry,
	ViewContainerLocation,
} from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { ISlateChatService, SlateChatService } from '../common/slateChatService.js';
import { SlateChatViewPane } from './slateChatView.js';

const SLATE_CHAT_CONTAINER_ID = 'workbench.view.slate';
const SLATE_CHAT_WELCOME_STORAGE_KEY = 'slate.chat.welcomeShown';
const SLATE_SHELL_MIGRATION_STORAGE_KEY = 'slate.shell.v1Applied';

Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration).registerDefaultConfigurations([{
	overrides: {
		'workbench.activityBar.location': 'top',
		'workbench.activityBar.autoHide': false,
		'workbench.activityBar.compact': false,
		'window.menuBarVisibility': 'compact',
		'window.commandCenter': true,
	},
}]);

const slateChatIcon = registerIcon(
	'slate-chat-view-icon',
	Codicon.chatSparkle,
	localize('slateChatViewIcon', "View icon of the Slate Chat view."),
);

const viewContainersRegistry = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry);
const viewsRegistry = Registry.as<IViewsRegistry>(ViewContainerExtensions.ViewsRegistry);

const slateChatContainer = viewContainersRegistry.registerViewContainer({
	id: SLATE_CHAT_CONTAINER_ID,
	title: localize2('slateChatContainer', "Slate"),
	icon: slateChatIcon,
	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [SLATE_CHAT_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
	storageId: SLATE_CHAT_CONTAINER_ID,
	order: 1,
}, ViewContainerLocation.AuxiliaryBar);

const slateChatViewDescriptor: IViewDescriptor = {
	id: SlateChatViewPane.ID,
	name: localize2('slateChatView', "Slate Chat"),
	containerIcon: slateChatIcon,
	ctorDescriptor: new SyncDescriptor(SlateChatViewPane),
	canToggleVisibility: false,
	canMoveView: true,
};

viewsRegistry.registerViews([slateChatViewDescriptor], slateChatContainer);

// The descriptor overload rather than the constructor one: `SlateChatService` takes an injectable
// identifier generator, which the constructor overload rejects because it requires every parameter
// to be a service. No static argument is passed, so the real generator applies in production.
registerSingleton(ISlateChatService, new SyncDescriptor(SlateChatService, [], true));

class OpenSlateChatAction extends Action2 {
	constructor() {
		super({
			id: 'slate.openChat',
			title: localize2('slate.openChat', "Open Chat"),
			category: localize2('slate.category', "Slate"),
			f1: true,
		});
	}

	override async run(accessor: ServicesAccessor): Promise<void> {
		await accessor.get(IViewsService).openView(SlateChatViewPane.ID, true);
	}
}

registerAction2(OpenSlateChatAction);

class SlateChatWelcomeContribution implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.slate.chatWelcome';

	constructor(
		@IViewsService viewsService: IViewsService,
		@IStorageService storageService: IStorageService,
		@IConfigurationService configurationService: IConfigurationService,
	) {
		if (!storageService.getBoolean(SLATE_SHELL_MIGRATION_STORAGE_KEY, StorageScope.PROFILE, false)) {
			void this._applyShellMigration(configurationService, storageService);
		}

		if (storageService.getBoolean(SLATE_CHAT_WELCOME_STORAGE_KEY, StorageScope.PROFILE, false)) {
			return;
		}

		storageService.store(SLATE_CHAT_WELCOME_STORAGE_KEY, true, StorageScope.PROFILE, StorageTarget.USER);
		void viewsService.openView(SlateChatViewPane.ID, false);
	}

	private async _applyShellMigration(
		configurationService: IConfigurationService,
		storageService: IStorageService,
	): Promise<void> {
		await Promise.all([
			configurationService.updateValue('workbench.activityBar.location', 'top', ConfigurationTarget.USER),
			configurationService.updateValue('workbench.activityBar.autoHide', false, ConfigurationTarget.USER),
			configurationService.updateValue('workbench.activityBar.compact', false, ConfigurationTarget.USER),
			configurationService.updateValue('window.menuBarVisibility', 'compact', ConfigurationTarget.USER),
			configurationService.updateValue('window.commandCenter', true, ConfigurationTarget.USER),
		]);
		storageService.store(SLATE_SHELL_MIGRATION_STORAGE_KEY, true, StorageScope.PROFILE, StorageTarget.USER);
	}
}

registerWorkbenchContribution2(
	SlateChatWelcomeContribution.ID,
	SlateChatWelcomeContribution,
	WorkbenchPhase.AfterRestored,
);
