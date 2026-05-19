import nock from 'nock';
import { setupTmpHome, TmpHome } from '../../helpers/tmp-home';
import { disableRealNetwork, restoreNetwork, mockTokenEndpoint } from '../../helpers/nock-setup';
import { SpokeApiClient } from '../../../src/lib/api/client';
import { ActiveProfile } from '../../../src/lib/auth/profiles';
import * as groups from '../../../src/lib/api/groups';

const profile: ActiveProfile = {
  name: 'default',
  clientId: 'cid',
  clientSecret: 'sec',
  apiUrl: 'https://integration.spokephone.com',
  authUrl: 'https://auth.spokephone.com/oauth/token',
  ephemeral: false,
};

describe('api/groups', () => {
  let tmp: TmpHome;
  beforeAll(() => disableRealNetwork());
  afterAll(() => restoreNetwork());
  beforeEach(() => {
    tmp = setupTmpHome();
    nock.cleanAll();
  });
  afterEach(() => tmp.cleanup());

  it('list filters directory to type=team', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com')
      .get('/directory')
      .query({ limit: '1000' })
      .reply(200, {
        meta: {},
        entries: [
          { id: 'u1', extension: '101', type: 'user' },
          { id: 't1', extension: '200', displayName: 'Sales', type: 'team', availability: { totalMembers: 3, totalAvailable: 2 } },
        ],
      });
    const c = new SpokeApiClient({ active: profile });
    const out = await groups.list(c);
    expect(out).toHaveLength(1);
    expect(out[0].displayName).toBe('Sales');
  });

  it('get fetches a team by UUID', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory/8cbb9b90-3a86-11f1-9f00-5f8007bb0e93').reply(200, {
      id: '8cbb9b90-3a86-11f1-9f00-5f8007bb0e93', extension: '200', displayName: 'Sales', type: 'team',
      teamMembers: [{ id: 'm1', availability: { status: 'available' } }],
    });
    const c = new SpokeApiClient({ active: profile });
    const g = await groups.get(c, '8cbb9b90-3a86-11f1-9f00-5f8007bb0e93');
    expect(g.displayName).toBe('Sales');
  });

  it('members reads teamMembers field', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').query({ extension: '200' }).reply(200, {
      meta: {},
      entries: [
        {
          id: 't1', extension: '200', type: 'team',
          teamMembers: [
            { id: 'm1', availability: { status: 'available' } },
            { id: 'm2', availability: { status: 'busy' } },
          ],
        },
      ],
    });
    const c = new SpokeApiClient({ active: profile });
    const m = await groups.members(c, '200', { available: true });
    expect(m).toHaveLength(1);
  });

  it('availability prefers server-computed totalAvailable/totalMembers', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').query({ extension: '200' }).reply(200, {
      meta: {},
      entries: [
        {
          id: 't1', extension: '200', type: 'team',
          availability: { status: 'available', totalMembers: 6, totalAvailable: 4, availabilitySummary: '4 of 6 people available' },
          teamMembers: [],
        },
      ],
    });
    const c = new SpokeApiClient({ active: profile });
    const a = await groups.availability(c, '200');
    expect(a.total).toBe(6);
    expect(a.available).toBe(4);
    expect(a.summary).toContain('4 of 6');
  });

  it('availability falls back to teamMembers count when server count missing', async () => {
    mockTokenEndpoint();
    nock('https://integration.spokephone.com').get('/directory').query({ extension: '200' }).reply(200, {
      meta: {},
      entries: [
        {
          id: 't1', extension: '200', type: 'team',
          teamMembers: [
            { id: 'm1', availability: { status: 'available' } },
            { id: 'm2', availability: { status: 'available' } },
            { id: 'm3', availability: { status: 'busy' } },
          ],
        },
      ],
    });
    const c = new SpokeApiClient({ active: profile });
    const a = await groups.availability(c, '200');
    expect(a.total).toBe(3);
    expect(a.available).toBe(2);
  });
});
