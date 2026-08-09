import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    docs: {
      description: {
        component:
          'media-ui-react ships no styles or markup — every story below provides its own minimal example markup to demonstrate the prop-getter contract.'
      }
    }
  }
};

export default preview;
