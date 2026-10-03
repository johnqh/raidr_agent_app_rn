import React from 'react';
import { View } from 'react-native';
import { Heading, Spinner } from '@sudobility/components-rn';
import { APP_NAME } from '@/config/constants';

export default function SplashScreen() {
  return (
    <View className='flex-1 bg-background items-center justify-center'>
      <Heading level={1} size='2xl' weight='bold' className='mb-6'>
        {APP_NAME}
      </Heading>
      <Spinner size='large' className='mt-4' />
    </View>
  );
}
