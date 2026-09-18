import React from 'react';
import { Tabs } from 'expo-router';
import { BottomNavBar } from '@/components/layout/BottomNavBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={props => <BottomNavBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
        }}
      />
    </Tabs>
  );
}
