import { useEffect, useRef } from 'react';
import { animate, stagger, inView, scroll } from 'motion';

export const useMotion = () => {
  const ref = useRef<HTMLElement>(null);

  // Staggered entrance animation for lists
  const staggerIn = (selector: string, options = {}) => {
    animate(
      selector,
      { opacity: [0, 1], y: [20, 0] },
      {
        delay: stagger(0.1),
        duration: 0.6,
        ease: "easeOut",
        ...options
      }
    );
  };

  // Card hover animation
  const cardHover = (element: HTMLElement) => {
    const controls = animate(
      element,
      { scale: [1, 1.02], y: [0, -4] },
      { duration: 0.3, ease: "easeOut" }
    );
    
    return () => controls.stop();
  };

  // Button press animation
  const buttonPress = (element: HTMLElement) => {
    animate(
      element,
      { scale: [1, 0.95] },
      { duration: 0.1, ease: "easeOut" }
    );
  };

  // Page entrance animation
  const pageEntrance = (selector: string) => {
    animate(
      selector,
      { opacity: [0, 1], y: [30, 0] },
      { duration: 0.8, ease: "easeOut" }
    );
  };

  // Modal entrance animation
  const modalEntrance = (element: HTMLElement) => {
    return animate(
      element,
      { 
        opacity: [0, 1], 
        scale: [0.9, 1],
        y: [20, 0]
      },
      { 
        duration: 0.4, 
        ease: "easeOut",
        type: "spring",
        stiffness: 300
      }
    );
  };

  // Text typing animation
  const typeText = (element: HTMLElement, text: string, speed = 50) => {
    element.textContent = '';
    let i = 0;
    
    const typeChar = () => {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        setTimeout(typeChar, speed);
      }
    };
    
    typeChar();
  };

  // Scroll-triggered animations
  const scrollTrigger = (selector: string, animation: any) => {
    inView(selector, (info) => {
      animate(info.target, animation, { duration: 0.8, ease: "easeOut" });
    });
  };

  // Parallax effect
  const parallax = (element: HTMLElement, speed = 0.5) => {
    scroll(
      animate(element, { y: [0, `${speed * 100}%`] }),
      { target: element }
    );
  };

  // Loading spinner animation
  const loadingSpinner = (element: HTMLElement) => {
    return animate(
      element,
      { rotate: [0, 360] },
      { duration: 1, repeat: Infinity, ease: "linear" }
    );
  };

  // Success celebration animation
  const successCelebration = (element: HTMLElement) => {
    animate(
      element,
      { 
        scale: [0, 1.2, 1],
        rotate: [0, 10, -10, 0]
      },
      { 
        duration: 0.8, 
        ease: "easeOut",
        type: "spring",
        stiffness: 200
      }
    );
  };

  // Badge state change animation
  const badgeStateChange = (element: HTMLElement) => {
    animate(
      element,
      { scale: [1, 1.1, 1] },
      { duration: 0.3, ease: "easeOut" }
    );
  };

  return {
    staggerIn,
    cardHover,
    buttonPress,
    pageEntrance,
    modalEntrance,
    typeText,
    scrollTrigger,
    parallax,
    loadingSpinner,
    successCelebration,
    badgeStateChange
  };
}; 