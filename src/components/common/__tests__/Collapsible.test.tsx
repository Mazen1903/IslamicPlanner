import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { Collapsible } from '../Collapsible';

describe('Collapsible', () => {
  it('renders children when expanded is true', async () => {
    const { getByText, getByTestId } = await render(
      <Collapsible expanded={true} testID="test-collapsible">
        <Text>Expanded Content</Text>
      </Collapsible>
    );

    expect(getByTestId('test-collapsible')).toBeTruthy();
    expect(getByText('Expanded Content')).toBeTruthy();
  });

  it('unmounts children when expanded is false and unmountOnCollapse is true', async () => {
    const { queryByText, queryByTestId } = await render(
      <Collapsible expanded={false} unmountOnCollapse={true} testID="test-collapsible">
        <Text>Hidden Content</Text>
      </Collapsible>
    );

    expect(queryByTestId('test-collapsible')).toBeNull();
    expect(queryByText('Hidden Content')).toBeNull();
  });
});
