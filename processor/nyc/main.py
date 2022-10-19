import json
import math

geoNetworksSave = []
geoNodes = []

with open('data/nyc/formed_threshold_200_b_2.json', 'r') as load_f:
  geoNetworks = json.load(load_f)
  # print(len(geoNetworks[0]))
  # print(len(geoNetworks[0][0]))
  # print(len(geoNetworks[0][1]))
  # print(len(geoNetworks[0][2]))
  # print(len(geoNetworks[0][3]))
  # print(len(geoNetworks[0][4]))

  # 取一天试试
  i = 0

  # for j in range(0, 8):
  #     print(j, len(geoNetworks[0][j]))
  #     print(geoNetworks[0][j])
      # geoNetworksSave += geoNetworks[0][j]
  for g in geoNetworks[3][2]:
      # round(math.pow(len(p['supportings']), 0.85))

      for traj in g:
        for oid in traj['g']:
          for did in traj['g'][oid]:
            traj['g'][oid][did] = round(math.pow(traj['g'][oid][did], 0.85))
        geoNetworksSave.append(traj)
        i += 1
  # for g in geoNetworks[0][3]:
  #     # round(math.pow(len(p['supportings']), 0.85))

  #     for traj in g:
  #       for oid in traj['g']:
  #         for did in traj['g'][oid]:
  #           traj['g'][oid][did] = round(math.pow(traj['g'][oid][did], 0.5))
  #       geoNetworksSave.append(traj)
  #       i += 1
  print(len(geoNetworksSave))


with open('data/nyc/geo-networks.json', 'w') as f:
  json.dump(geoNetworksSave, f, ensure_ascii=False)


with open('data/nyc/position.json', 'r') as load_f2:
  geoNodes = json.load(load_f2)

  for n in geoNodes:
    tmp = n['lat']
    n['lat'] = n['lng']
    n['lng'] = tmp


with open('data/nyc/geo-nodes.json', 'w') as f:
  json.dump(geoNodes, f, ensure_ascii=False)