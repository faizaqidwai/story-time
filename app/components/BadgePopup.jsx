// components/BadgePopup.jsx
import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Animated } from 'react-native';

const BadgePopup = ({ visible, onClose, badge }) => {
  const badges = {
    first_story: {
      icon: '📖',
      title: 'First Story Complete!',
      description: 'You finished your very first story!',
      color: '#FF6B9D',
    },
  };

  const currentBadge = badges[badge] || badges.first_story;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.icon}>{currentBadge.icon}</Text>
          <Text style={styles.title}>{currentBadge.title}</Text>
          <Text style={styles.description}>{currentBadge.description}</Text>
          
          <Pressable 
            style={[styles.button, { backgroundColor: currentBadge.color }]} 
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Awesome! 🎉</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 30,
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#154D71',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    minWidth: 200,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
});

export default BadgePopup;