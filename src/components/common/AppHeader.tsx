import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, X } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight } from '../../theme';

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  showClose?: boolean;
  right?: React.ReactNode;
  onBack?: () => void;
}

export default function AppHeader({
  title,
  showBack = false,
  showClose = false,
  right,
  onBack,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  function handleBack() {
    if (onBack) {
      onBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.left}>
        {(showBack || showClose) && (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {showClose
              ? <X color={colors.text} size={22} />
              : <ChevronLeft color={colors.text} size={26} />
            }
          </TouchableOpacity>
        )}
      </View>

      {title ? (
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      ) : (
        <View style={styles.titlePlaceholder} />
      )}

      <View style={styles.right}>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    minHeight: 52,
  },
  left: {
    width: 44,
    alignItems: 'flex-start',
  },
  right: {
    width: 44,
    alignItems: 'flex-end',
  },
  iconBtn: {
    padding: spacing.xs,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  titlePlaceholder: {
    flex: 1,
  },
});
