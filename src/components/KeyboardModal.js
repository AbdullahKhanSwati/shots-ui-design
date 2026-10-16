import React from 'react';
import { KeyboardAvoidingView, Modal } from 'react-native';

// Drop-in replacement for React Native's <Modal>: whatever is inside is lifted
// above the on-screen keyboard, so a text box in a pop-up (especially one
// anchored to the bottom of the screen) is never hidden behind it.
// 'padding' only adds the part of the keyboard that actually overlaps, so it
// is safe whether or not the window itself already resized.
export default function KeyboardModal({ children, ...props }) {
  return (
    <Modal {...props}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        {children}
      </KeyboardAvoidingView>
    </Modal>
  );
}
