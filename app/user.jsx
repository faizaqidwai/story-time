import { StyleSheet, Text, View, Button } from 'react-native'
import React from 'react'
import { useUser } from './_hooks/useUser'

const User = () => {
const {user} = useUser()
const handleUser = () =>{
console.log('current usser: ',user)
}
  return (
    <View>
      <Button title="User" onPress={handleUser} />
    </View>
  )
}

export default User

const styles = StyleSheet.create({})