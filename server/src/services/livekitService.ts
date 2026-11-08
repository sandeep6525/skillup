import { AccessToken } from 'livekit-server-sdk';
import { config } from '../config';

export interface GenerateLiveKitTokenParams {
  roomName: string;
  participantIdentity: string;
  participantName: string;
  isHost?: boolean;
}

export const generateLiveKitToken = async ({
  roomName,
  participantIdentity,
  participantName,
  isHost = false,
}: GenerateLiveKitTokenParams): Promise<string> => {
  const at = new AccessToken(config.livekit.apiKey, config.livekit.apiSecret, {
    identity: participantIdentity,
    name: participantName,
    ttl: '4h', // short-lived 4 hours session grant
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: isHost,
    roomRecord: isHost,
  });

  return await at.toJwt();
};
