import React from 'react';

export function Text(props: any) {
  return React.createElement('Text', props, props.children);
}

export function VStack(props: any) {
  return React.createElement('VStack', props, props.children);
}

export function HStack(props: any) {
  return React.createElement('HStack', props, props.children);
}

export function Spacer(props: any) {
  return React.createElement('Spacer', props);
}

export function Divider(props: any) {
  return React.createElement('Divider', props);
}

export function Group(props: any) {
  return React.createElement('Group', props, props.children);
}
