/**
 * VoiceInput Component - Speech-to-Text for Hindi/English
 * Requirement 2.7: Voice input with Hindi and English support
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Note: This would require @react-native-voice/voice package
// For now, we'll create the interface and mock the functionality

interface VoiceInputProps {
  onResult: (text: string) => void;
  onError?: (error: string) => void;
  language?: 'en-US' | 'hi-IN';
  placeholder?: string;
  buttonStyle?: any;
  disabled?: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onResult,
  onError,
  language = 'en-US',
  placeholder = 'Tap to speak',
  buttonStyle,
  disabled = false,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  
  // Animation values
  const pulseAnim = new Animated.Value(1);
  const waveAnim = new Animated.Value(0);

  useEffect(() => {
    if (isListening) {
      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Start wave animation
      Animated.loop(
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      pulseAnim.setValue(1);
      waveAnim.setValue(0);
    }
  }, [isListening]);

  const startListening = async () => {
    try {
      // Check if voice recognition is available
      if (!isVoiceRecognitionAvailable()) {
        Alert.alert(
          'Voice Input Not Available',
          'Voice recognition is not supported on this device or requires additional setup.'
        );
        return;
      }

      setIsListening(true);
      setIsModalVisible(true);
      setRecognizedText('');

      // Mock voice recognition for demo
      // In real implementation, this would use @react-native-voice/voice
      mockVoiceRecognition();

    } catch (error) {
      console.error('Voice recognition error:', error);
      onError?.('Failed to start voice recognition');
      setIsListening(false);
      setIsModalVisible(false);
    }
  };

  const stopListening = async () => {
    try {
      setIsListening(false);
      
      // In real implementation: await Voice.stop();
      
      if (recognizedText.trim()) {
        onResult(recognizedText.trim());
      }
      
      setIsModalVisible(false);
    } catch (error) {
      console.error('Stop listening error:', error);
      onError?.('Failed to stop voice recognition');
    }
  };

  const cancelListening = async () => {
    try {
      setIsListening(false);
      setIsModalVisible(false);
      setRecognizedText('');
      
      // In real implementation: await Voice.cancel();
    } catch (error) {
      console.error('Cancel listening error:', error);
    }
  };

  // Mock function - replace with actual voice recognition
  const mockVoiceRecognition = () => {
    const mockTexts = {
      'en-US': [
        'There is a pothole on Main Street',
        'Street light is not working',
        'Water pipe is leaking',
        'Garbage not collected',
      ],
      'hi-IN': [
        'मुख्य सड़क पर गड्ढा है',
        'स्ट्रीट लाइट काम नहीं कर रही',
        'पानी का पाइप लीक हो रहा है',
        'कचरा नहीं उठाया गया',
      ],
    };

    // Simulate progressive recognition
    let currentText = '';
    const targetText = mockTexts[language][Math.floor(Math.random() * mockTexts[language].length)];
    const words = targetText.split(' ');

    let wordIndex = 0;
    const interval = setInterval(() => {
      if (wordIndex < words.length && isListening) {
        currentText += (wordIndex > 0 ? ' ' : '') + words[wordIndex];
        setRecognizedText(currentText);
        // Mock volume feedback (visual only)
        wordIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          if (isListening) {
            setIsListening(false);
            onResult(currentText);
            setIsModalVisible(false);
          }
        }, 500);
      }
    }, 600);

    // Auto-stop after 10 seconds
    setTimeout(() => {
      if (isListening) {
        clearInterval(interval);
        setIsListening(false);
        if (currentText.trim()) {
          onResult(currentText.trim());
        }
        setIsModalVisible(false);
      }
    }, 10000);
  };

  const isVoiceRecognitionAvailable = (): boolean => {
    // In real implementation, check Voice.isAvailable()
    return Platform.OS === 'ios' || Platform.OS === 'android';
  };

  const getLanguageLabel = (): string => {
    return language === 'hi-IN' ? 'हिंदी' : 'English';
  };

  const renderWaveform = () => {
    const bars = Array.from({ length: 5 }, (_, i) => {
      const animatedHeight = waveAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [20, 60 + Math.sin(i) * 20],
      });

      return (
        <Animated.View
          key={i}
          style={[
            styles.waveBar,
            {
              height: animatedHeight,
              opacity: isListening ? 0.8 : 0.3,
            },
          ]}
        />
      );
    });

    return <View style={styles.waveform}>{bars}</View>;
  };

  return (
    <>
      {/* Voice Input Button */}
      <TouchableOpacity
        style={[styles.voiceButton, buttonStyle, disabled && styles.voiceButtonDisabled]}
        onPress={startListening}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="mic" 
          size={20} 
          color={disabled ? '#94A3B8' : '#1976D2'} 
        />
        <Text style={[styles.voiceButtonText, disabled && styles.voiceButtonTextDisabled]}>
          {placeholder}
        </Text>
      </TouchableOpacity>

      {/* Voice Recognition Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelListening}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Voice Input</Text>
              <View style={styles.languageTag}>
                <Text style={styles.languageText}>{getLanguageLabel()}</Text>
              </View>
            </View>

            {/* Microphone Animation */}
            <View style={styles.microphoneContainer}>
              <Animated.View
                style={[
                  styles.microphoneCircle,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <LinearGradient
                  colors={isListening ? ['#1976D2', '#1565C0'] : ['#94A3B8', '#64748B']}
                  style={styles.microphoneGradient}
                >
                  <Ionicons 
                    name="mic" 
                    size={48} 
                    color="#FFF" 
                  />
                </LinearGradient>
              </Animated.View>

              {/* Volume Indicator Rings */}
              {isListening && (
                <>
                  <Animated.View
                    style={[
                      styles.volumeRing,
                      styles.volumeRing1,
                      {
                        opacity: waveAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.2, 0.6],
                        }),
                        transform: [{
                          scale: waveAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.5],
                          }),
                        }],
                      },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.volumeRing,
                      styles.volumeRing2,
                      {
                        opacity: waveAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.1, 0.4],
                        }),
                        transform: [{
                          scale: waveAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1.2, 2],
                          }),
                        }],
                      },
                    ]}
                  />
                </>
              )}
            </View>

            {/* Status Text */}
            <Text style={styles.statusText}>
              {isListening ? 'Listening...' : 'Tap to start speaking'}
            </Text>

            {/* Waveform */}
            {renderWaveform()}

            {/* Recognized Text */}
            <View style={styles.textContainer}>
              <Text style={styles.recognizedText}>
                {recognizedText || (language === 'hi-IN' ? 'बोलना शुरू करें...' : 'Start speaking...')}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cancelListening}
              >
                <Ionicons name="close" size={24} color="#EF4444" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              {isListening ? (
                <TouchableOpacity
                  style={styles.stopButton}
                  onPress={stopListening}
                >
                  <Ionicons name="stop" size={24} color="#FFF" />
                  <Text style={styles.stopButtonText}>Stop</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.startButton}
                  onPress={startListening}
                >
                  <Ionicons name="mic" size={24} color="#FFF" />
                  <Text style={styles.startButtonText}>Start</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Instructions */}
            <Text style={styles.instructionText}>
              {language === 'hi-IN' 
                ? 'स्पष्ट रूप से और धीरे बोलें' 
                : 'Speak clearly and slowly'
              }
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // Voice Button
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 6,
  },
  voiceButtonDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  voiceButtonText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  voiceButtonTextDisabled: {
    color: '#94A3B8',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  languageTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  languageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
  },

  // Microphone Animation
  microphoneContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  microphoneCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  microphoneGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  volumeRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#1976D2',
    borderRadius: 100,
  },
  volumeRing1: {
    width: 140,
    height: 140,
  },
  volumeRing2: {
    width: 160,
    height: 160,
  },

  // Status and Text
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 16,
  },
  textContainer: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    minHeight: 60,
    justifyContent: 'center',
    marginBottom: 24,
  },
  recognizedText: {
    fontSize: 16,
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Waveform
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
    marginBottom: 16,
    gap: 4,
  },
  waveBar: {
    width: 4,
    backgroundColor: '#1976D2',
    borderRadius: 2,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  stopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976D2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },

  // Instructions
  instructionText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});
