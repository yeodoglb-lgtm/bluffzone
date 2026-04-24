import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import { colors, spacing, fontSize, fontWeight, radius } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';
import { streamChat } from '../../services/claudeApi';
import type { ChatMessage } from '../../services/claudeApi';
import { getOrCreateChat, loadMessages, saveMessage, clearMessages } from '../../services/aiChat';
import { showConfirm } from '../../utils/alert';

type Props = StackScreenProps<RootStackParamList, 'AIChat'>;

const SYSTEM_PROMPT =
  '당신은 블러프존 포커 코치입니다. 한국어로 답변하세요. 포커 전략, 핸드 분석, 멘탈에 대해 전문적으로 조언합니다.';

const EXAMPLE_QUESTIONS = [
  '프리플랍 AKo BTN에서 어떻게?',
  '팟 오즈 계산 방법',
  '틸트 관리 팁',
];

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleWrapper, isUser ? styles.bubbleWrapperUser : styles.bubbleWrapperAssistant]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={styles.bubbleText}>{message.content}</Text>
      </View>
    </View>
  );
}

function StreamingBubble({ text }: { text: string }) {
  return (
    <View style={[styles.bubbleWrapper, styles.bubbleWrapperAssistant]}>
      <View style={[styles.bubble, styles.bubbleAssistant]}>
        <Text style={styles.bubbleText}>{text}</Text>
      </View>
    </View>
  );
}

export default function AIChatScreen({ navigation }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  // 초기 로드: 채팅 ID 확보 + 이전 메시지 복원
  useEffect(() => {
    (async () => {
      try {
        const id = await getOrCreateChat();
        setChatId(id);
        const prev = await loadMessages(id);
        setMessages(prev.map(m => ({ role: m.role, content: m.content })));
      } catch (e) {
        // 로드 실패 시 빈 상태 유지 (로그인 필요 등)
        console.warn('[AIChat] 초기 로드 실패:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleSend = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isStreaming) return;

    const userMsg: ChatMessage = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);
    setStreamingText('');

    // 사용자 메시지 저장 (비동기, 실패해도 UI 진행)
    if (chatId) saveMessage(chatId, 'user', content).catch(() => {});

    try {
      let full = '';
      for await (const chunk of streamChat(newMessages, 'gpt-4o-mini', SYSTEM_PROMPT)) {
        full += chunk;
        setStreamingText(full);
      }
      setMessages(prev => [...prev, { role: 'assistant', content: full }]);
      if (chatId) saveMessage(chatId, 'assistant', full).catch(() => {});
    } catch {
      const errMsg = '오류가 발생했습니다. 다시 시도해주세요.';
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: errMsg },
      ]);
      if (chatId) saveMessage(chatId, 'assistant', errMsg).catch(() => {});
    } finally {
      setIsStreaming(false);
      setStreamingText('');
    }
  }, [input, messages, isStreaming, chatId]);

  const handleClear = useCallback(() => {
    if (!chatId || messages.length === 0) return;
    showConfirm({
      title: '대화 삭제',
      message: '모든 대화 내용을 삭제할까요?',
      confirmText: '삭제',
      destructive: true,
      onConfirm: async () => {
        try {
          await clearMessages(chatId);
          setMessages([]);
        } catch {
          // 실패 무시
        }
      },
    });
  }, [chatId, messages.length]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ChatMessage>) => <MessageBubble message={item} />,
    []
  );

  const keyExtractor = useCallback((_: ChatMessage, index: number) => String(index), []);

  const hasContent = messages.length > 0 || isStreaming;
  const isEmpty = !hasContent;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>블러프존 홀덤 알파고</Text>
        {messages.length > 0 ? (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>초기화</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 52 }} />
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : isEmpty ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🤖</Text>
            <Text style={styles.emptyTitle}>블러프존 홀덤 알파고</Text>
            <Text style={styles.emptyDesc}>핸드 분석, 전략, 멘탈 등 무엇이든 물어보세요</Text>
            <View style={styles.exampleChips}>
              {EXAMPLE_QUESTIONS.map((q, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.exampleChip}
                  onPress={() => handleSend(q)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.exampleChipText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListFooterComponent={
              isStreaming && streamingText ? (
                <StreamingBubble text={streamingText} />
              ) : null
            }
          />
        )}

        <View style={styles.inputArea}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="포커 코치에게 물어보세요..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={2000}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[styles.sendBtn, isStreaming && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={isStreaming || !input.trim()}
            activeOpacity={0.8}
          >
            <Text style={styles.sendBtnText}>▲</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.bg,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backText: { fontSize: fontSize.lg, color: colors.text },
  headerTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  clearBtn: {
    width: 52,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  clearBtnText: { fontSize: fontSize.sm, color: colors.textMuted },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  messageList: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    flexGrow: 1,
  },

  bubbleWrapper: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
  },
  bubbleWrapperUser: { justifyContent: 'flex-end' },
  bubbleWrapperAssistant: { justifyContent: 'flex-start' },

  bubble: {
    maxWidth: '80%',
    borderRadius: radius.card,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radius.sm,
  },
  bubbleAssistant: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  bubbleText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 21,
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
  exampleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  exampleChip: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  exampleChipText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },

  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surfaceAlt,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.button,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnDisabled: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sendBtnText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.bold,
  },
});
