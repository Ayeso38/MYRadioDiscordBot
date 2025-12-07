// src/constants.ts
// Copy your entire constants.ts from radio.aizahir.com here

import { Station } from './types';

export const STATES = [
  "All",
  "Kuala Lumpur",
  "Selangor",
  "Penang",
  "Johor",
  "Sabah",
  "Sarawak",
  "Perak",
  "Kedah",
  "Terengganu"
];

export const STATIONS: Station[] = [
  // Kuala Lumpur (National/Major)
  {
    id: 'hitz-fm',
    name: 'Hitz FM',
    frequency: '92.9 FM',
    state: 'Kuala Lumpur',
    category: 'Music',
    streamUrl: "https://stream-eu-a.rcs.revma.com/488kt4sbv4uvv/68_1txzsglqw5l3t02/playlist.m3u8",
    logoColor: 'bg-red-500'
  },
  {
    id: 'fly-fm',
    name: 'Fly FM',
    frequency: '95.8 FM',
    state: 'Kuala Lumpur',
    category: 'Music',
    streamUrl: "https://stream.rcs.revma.com/q17aka9mtd3vv/13_1u91hg8lgos6k02/playlist.m3u8",
    logoColor: 'bg-yellow-500'
  },
  {
    id: 'bfm-899',
    name: 'BFM 89.9',
    frequency: '89.9 FM',
    state: 'Kuala Lumpur',
    category: 'Talk',
    streamUrl: "http://playerservices.streamtheworld.com/api/livestream-redirect/BFM.mp3",
    logoColor: 'bg-orange-600'
  },
  {
    id: 'hot-fm',
    name: 'Hot FM',
    frequency: '97.6 FM',
    state: 'Kuala Lumpur',
    category: 'Music',
    streamUrl: "https://n05.rcs.revma.com/drakdf8mtd3vv?rj-ttl=5&rj-tok=AAABmvnwRdIAlsSJ3M2YY_hOjQ",
    logoColor: 'bg-purple-500',
    logo: "https://cdn.instant.audio/images/logos/radioonline-my/hot.png"
  },
  {
    id: 'era-fm',
    name: 'ERA',
    frequency: '103.3 FM',
    state: 'Kuala Lumpur',
    category: 'Music',
    streamUrl: "https://n05.rcs.revma.com/gs7xxfmbv4uvv/5_1afc0sltzyu6s02/main/176785483.aac",
    logoColor: 'bg-blue-500',
    logo: "https://media2.fishtank.my/stations/era/2025/era_square_updated.png"
  },
  {
    id: 'sinar-fm',
    name: 'SINAR',
    frequency: '96.7 FM',
    state: 'Kuala Lumpur',
    category: 'Music',
    streamUrl: "https://n02.rcs.revma.com/azatk0tbv4uvv?rj-ttl=5&rj-tok=AAABms_vU4wA1UueZFC58sxkYg",
    logoColor: 'bg-blue-500',
    logo: "https://d62zl39gesnj2.cloudfront.net/stations/sinar/2025/sinar-square_march_2025.png"
  },
  // Selangor
  {
    id: 'selangor-fm',
    name: 'Selangor FM',
    frequency: '100.9 FM',
    state: 'Selangor',
    category: 'General',
    streamUrl: "https://28163.live.streamtheworld.com/SELANGOR_FMAAC.aac",
    logoColor: 'bg-red-700'
  },
  {
    id: 'best-fm-sel',
    name: 'Best FM',
    frequency: '104.1 FM',
    state: 'Selangor',
    category: 'Music',
    streamUrl: "https://n14.rcs.revma.com/h34x4kgg9hhvv?rj-ttl=5&rj-tok=AAABms-QbfEACEUJ-vYPbg6_dQ",
    logoColor: 'bg-blue-400'
  },

  // Penang
  {
    id: 'mutiara-fm',
    name: 'Mutiara FM',
    frequency: '95.7 FM',
    state: 'Penang',
    category: 'General',
    streamUrl: "https://22253.live.streamtheworld.com/MUTIARA_FMAAC.aac",
    logoColor: 'bg-cyan-500'
  },
  
  // Johor
  {
    id: 'johor-fm',
    name: 'Johor FM',
    frequency: '101.9 FM',
    state: 'Johor',
    category: 'General',
    streamUrl: "https://22273.live.streamtheworld.com/JOHOR_FMAAC.aac",
    logoColor: 'bg-blue-800'
  },
  {
    id: 'best-fm-jhr',
    name: 'Best 104',
    frequency: '104.9 FM',
    state: 'Johor',
    category: 'Music',
    streamUrl: "https://n14.rcs.revma.com/h34x4kgg9hhvv?rj-ttl=5&rj-tok=AAABms-QbfEACEUJ-vYPbg6_dQ",
    logoColor: 'bg-indigo-500'
  },

  // Sabah
  {
    id: 'sabah-fm',
    name: 'Sabah FM',
    frequency: '89.9 FM',
    state: 'Sabah',
    category: 'General',
    streamUrl: "https://22273.live.streamtheworld.com/SABAH_FMAAC.aac",
    logoColor: 'bg-green-600'
  },
  {
    id: 'kk-fm',
    name: 'KK FM',
    frequency: '96.3 FM',
    state: 'Sabah',
    category: 'Music',
    streamUrl: "https://n09.rcs.revma.com/axht8yawe1bwv?rj-ttl=5&rj-tok=AAABms-b9yEAXYlA586tGX0ZXg",
    logoColor: 'bg-green-400'
  },

  // Sarawak
  {
    id: 'sarawak-fm',
    name: 'Sarawak FM',
    frequency: '88.9 FM',
    state: 'Sarawak',
    category: 'General',
    streamUrl: "https://22273.live.streamtheworld.com/SARAWAK_FMAAC.aac",
    logoColor: 'bg-yellow-600'
  },
  {
    id: 'cats-fm',
    name: 'Cats FM',
    frequency: '99.3 FM',
    state: 'Sarawak',
    category: 'Music',
    streamUrl: "https://s4.yesstreaming.net:7019/stream",
    logoColor: 'bg-yellow-400'
  },
  
  // Terengganu
  {
    id: 'manis-fm',
    name: 'Manis FM',
    frequency: '90.6 FM',
    state: 'Terengganu',
    category: 'General',
    streamUrl: "https://n05.rcs.revma.com/nzgauqq1v7zuv?rj-ttl=5&rj-tok=AAABmsVbD5QAobsr4TGPLMOR7Q",
    logoColor: 'bg-red-400'
  },
  {
    id: 'terengganu-fm',
    name: 'Terengganu FM',
    frequency: '88.7 FM',
    state: 'Terengganu',
    category: 'General',
    streamUrl: "https://28093.live.streamtheworld.com/TERENGGANU_FMAAC.aac",
    logoColor: 'bg-red-400'
  },

  // Kedah
  {
    id: 'kedah-fm',
    name: 'Kedah FM',
    frequency: '97.5 FM',
    state: 'Kedah',
    category: 'General',
    streamUrl: "https://22283.live.streamtheworld.com/KEDAH_FMAAC.aac",
    logoColor: 'bg-green-700'
  }
  
];
