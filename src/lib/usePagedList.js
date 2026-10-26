import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

// Load-as-you-scroll for every list in the app.
//
// A screen shows the first PAGE_SIZE rows; scrolling near the bottom shows the
// next PAGE_SIZE, and so on. When the rows on the phone run out and the list
// can fetch older ones from the server (`loadMore` + `hasMore`), the next page
// is fetched the same way. Changing `resetKey` (a search, a filter, another
// month) starts again from the first page.
//
//   const page = usePagedList(rows, { resetKey: query });
//   <FlatList data={page.data} {...page.listProps} />
//   <ScrollView onScroll={page.onScroll} scrollEventThrottle={100}>{page.data.map(...)}{page.footer}</ScrollView>
export const PAGE_SIZE = 20;

export function usePagedList(items, {
  pageSize = PAGE_SIZE,
  resetKey,
  loadMore,          // async () => void — fetch older rows from the server
  hasMore = false,   // the server has more rows than the phone
  loadingMore = false,
} = {}) {
  const [count, setCount] = useState(pageSize);
  useEffect(() => { setCount(pageSize); }, [resetKey, pageSize]);

  const list = items || [];
  const total = list.length;
  const data = useMemo(() => list.slice(0, count), [list, count]);
  const moreOnPhone = count < total;
  const busyRef = useRef(false);

  const next = useCallback(async () => {
    if (busyRef.current) return;
    if (moreOnPhone) { setCount((c) => c + pageSize); return; }
    if (!hasMore || loadingMore || !loadMore) return;
    busyRef.current = true;
    try {
      await loadMore();
      setCount((c) => c + pageSize);
    } catch (e) {
      /* offline — try again on the next scroll */
    } finally {
      busyRef.current = false;
    }
  }, [moreOnPhone, hasMore, loadingMore, loadMore, pageSize]);

  // For ScrollView screens: fire when within ~300px of the bottom.
  const onScroll = useCallback(({ nativeEvent: e }) => {
    if (e.layoutMeasurement.height + e.contentOffset.y >= e.contentSize.height - 300) next();
  }, [next]);

  const showSpinner = moreOnPhone || hasMore || loadingMore;
  const footer = showSpinner ? (
    <View style={styles.footer}>
      <ActivityIndicator size="small" color="#9A9A9A" />
      <Text style={styles.footerText}>Loading more…</Text>
    </View>
  ) : null;

  const listProps = {
    onEndReached: next,
    onEndReachedThreshold: 0.5,
    ListFooterComponent: footer,
    initialNumToRender: 12,
    maxToRenderPerBatch: 10,
    windowSize: 7,
    removeClippedSubviews: true,
  };

  return { data, next, onScroll, footer, listProps, hasNext: moreOnPhone || hasMore };
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 18 },
  footerText: { color: '#9A9A9A', fontSize: 13 },
});
