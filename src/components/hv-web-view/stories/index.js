// @flow

/**
 * Copyright (c) Garuda Labs, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import * as Helpers from 'hyperview/storybook/helpers';
import HvWebView from 'hyperview/src/components/hv-web-view';
import React from 'react';
import { action } from '@storybook/addon-actions';

const createStory = Helpers.stories(HvWebView);
createStory('basic', ({ element, stylesheets }) => (
  <HvWebView
    element={element}
    onUpdate={action('onUpdate')}
    options={Helpers.getOptions()}
    stylesheets={stylesheets}
  />
));
