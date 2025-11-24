export type Participant = {
  _id: string;
  name?: string;
  email?: string;
  shop?: unknown;
  shopId?: unknown;
};

export type Message = {
  _id?: string;
  senderId: Participant | string;
  text: string;
  read?: boolean;
  createdAt?: string | Date;
};

export type Conversation = {
  _id: string;
  participants: Participant[];
  lastMessage?: string;
  updatedAt?: string | Date;
};
