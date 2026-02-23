import React from 'react'
import { View, StyleSheet, ImageBackground, Dimensions } from 'react-native'

const { width, height } = Dimensions.get('window')

const ScreenWrapper = ({ children, background }) => {
  return (
    <View style={styles.container}>
      <ImageBackground
        source={background}
        style={styles.background}
        resizeMode="cover" // fills screen while keeping aspect ratio
      >
        <View style={styles.overlay}>{children}</View>
      </ImageBackground>
    </View>
  )
}

export default ScreenWrapper

const styles = StyleSheet.create({
  container: {
    flex: 1,           // full screen
    width: '100%',
    height: '100%',
  },
  background: {
    flex: 1,           // makes image fill parent container
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,           // children also take full screen
  //  padding: 10,
  //  backgroundColor: 'rgba(0,0,0,0.3)',
  },
})
