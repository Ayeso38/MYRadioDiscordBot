# Radio Stations

MY.Radio supports 17+ Malaysian radio stations from 9 states.

## Kuala Lumpur

| Station | Frequency | Category |
|---------|-----------|----------|
| Hitz FM | 92.9 FM | Music |
| Fly FM | 95.8 FM | Music |
| BFM 89.9 | 89.9 FM | Talk |
| Hot FM | 97.6 FM | Music |
| ERA | 103.3 FM | Music |
| SINAR | 96.7 FM | Music |

## Selangor

| Station | Frequency | Category |
|---------|-----------|----------|
| Selangor FM | 100.9 FM | General |
| Best FM | 104.1 FM | Music |

## Penang

| Station | Frequency | Category |
|---------|-----------|----------|
| Mutiara FM | 95.7 FM | General |

## Johor

| Station | Frequency | Category |
|---------|-----------|----------|
| Johor FM | 101.9 FM | General |
| Best 104 | 104.9 FM | Music |

## Sabah

| Station | Frequency | Category |
|---------|-----------|----------|
| Sabah FM | 89.9 FM | General |
| KK FM | 96.3 FM | Music |

## Sarawak

| Station | Frequency | Category |
|---------|-----------|----------|
| Sarawak FM | 88.9 FM | General |
| Cats FM | 99.3 FM | Music |

## Terengganu

| Station | Frequency | Category |
|---------|-----------|----------|
| Manis FM | 90.6 FM | General |
| Terengganu FM | 88.7 FM | General |

## Kedah

| Station | Frequency | Category |
|---------|-----------|----------|
| Kedah FM | 97.5 FM | General |

---

## Adding New Stations

To add a new station, edit `src/constants.ts`:

```typescript
{
  id: 'station-id',
  name: 'Station Name',
  frequency: '100.0 FM',
  state: 'State Name',
  category: 'Music',
  streamUrl: 'https://stream-url.com/stream',
  logoColor: 'bg-blue-500'
}
```

Then rebuild: `npm run build`
