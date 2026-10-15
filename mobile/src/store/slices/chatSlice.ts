import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { api, getErrorMessage } from '../../api/client';
import { deleteAccount, logout } from './authSlice';
import type { ChatMessage } from '../../types';

interface ChatState {
  messages: ChatMessage[];
  sending: boolean;
  error: string | null;
}

const initialState: ChatState = {
  messages: [],
  sending: false,
  error: null,
};

export const sendChat = createAsyncThunk<
  { reply: string; card: ChatMessage['card'] },
  void,
  { state: { chat: ChatState }; rejectValue: string }
>('chat/send', async (_, { getState, rejectWithValue }) => {
  try {
    const { messages } = getState().chat;
    const { data } = await api.post<{
      reply: string;
      card: ChatMessage['card'];
    }>('/ai/chat', {
      messages,
    });
    return data;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    userMessageAdded(state, action: PayloadAction<string>) {
      state.messages.push({
        role: 'user',
        content: action.payload,
        createdAt: new Date().toISOString(),
      });
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(sendChat.pending, state => {
        state.sending = true;
      })
      .addCase(sendChat.fulfilled, (state, action) => {
        state.sending = false;
        state.messages.push({
          role: 'assistant',
          content: action.payload.reply,
          card: action.payload.card,
          createdAt: new Date().toISOString(),
        });
      })
      .addCase(sendChat.rejected, (state, action) => {
        state.sending = false;
        state.error = action.payload ?? 'Chat failed';
      })
      .addCase(logout.fulfilled, () => initialState)
      .addCase(deleteAccount.fulfilled, () => initialState);
  },
});

export const { userMessageAdded } = chatSlice.actions;
export default chatSlice.reducer;
