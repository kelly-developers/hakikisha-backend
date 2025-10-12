import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {HomeTab, ClaimsListTab, SettingTab} from '../tabs';
import BlogsTab from '../tabs/BlogsTab';
import {Image, Text, View} from 'react-native';
import {icons} from '../constants';

type TabBarItemProps = {
  source: any; // Adjust type according to your image sources
  focused: boolean;
  cart?: boolean;
  name?: string;
};
const TabBarItem: React.FC<TabBarItemProps> = ({
  source,
  focused,
  cart,
  name,
}) => {
  return (
    <View
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: cart ? -24 : 18,
      }}>
      <View
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          width: 'auto',
          height: 'auto',
        }}>
        <Image
          source={source}
          style={{
            tintColor: focused ? '#0A864D' : '#666',
            width: 24,
            height: 24,
          }}
        />
      </View>
      <Text
        className="font-pregular text-xs mt-1"
        style={{color: focused ? '#0A864D' : '#666'}}>
        {name}
      </Text>
    </View>
  );
};
type Props = {};
export type RouteTabsParamList = {
  Home: undefined;
  Claims: undefined;
  Blogs: undefined;
  Settings: undefined;
};
const HomeScreen = (props: Props) => {
  const Tab = createBottomTabNavigator<RouteTabsParamList>();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopColor: '#E5E7EB',
          height: 60,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarIconStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
      }}>
      <Tab.Screen
        name="Home"
        component={HomeTab}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({focused}) => (
            <TabBarItem source={icons.home} focused={focused} name="Home" />
          ),
        }}
      />
      <Tab.Screen
        name="Claims"
        component={ClaimsListTab}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({focused}) => (
            <TabBarItem
              source={icons.components}
              focused={focused}
              name="Claims"
            />
          ),
        }}
      />

      <Tab.Screen
        name="Blogs"
        component={BlogsTab}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({focused}) => (
            <TabBarItem 
              source={icons.components} 
              focused={focused} 
              name="Blogs" 
            />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingTab}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({focused}) => (
            <TabBarItem 
              source={icons.setting} 
              focused={focused} 
              name="Settings" 
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default HomeScreen;
