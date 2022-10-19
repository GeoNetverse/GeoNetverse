from dijkstar import Graph, find_path
# graph = Graph()
# graph.add_edge(1, 2, 110)
# graph.add_edge(2, 3, 125)
# graph.add_edge(3, 4, 108)
# find_path(graph, 1, 4)
# PathInfo(
#     nodes=[1, 2, 3, 4],
#     edges=[110, 125, 108],
#     costs=[110, 125, 108],
#     total_cost=343)

# "x":876,"y":361
# "x":1126,"y":396

import json
import math
import copy
import random

random.seed(10)


distDict = {}

with open('data/hefei/geo-nodes.json', 'r') as load_f2:
  geoNodes = json.load(load_f2)

  for n1 in geoNodes:
    distDict[n1['nid']] = {}
    for n2 in geoNodes:
      if (n1['nid'] == n2['nid']):
        continue
      d = math.sqrt((n1['x'] - n2['x']) * (n1['x'] - n2['x']) + (n1['y'] - n2['y']) * (n1['y'] - n2['y']))
      if d < 270:
        distDict[n1['nid']][n2['nid']] = round(d)
      else:
        distDict[n1['nid']][n2['nid']] = 100000



print(distDict['9']['19'])
# distDict['1']['7'] = 10

print(distDict['0'])

graph = Graph()
for n1 in geoNodes:
  for n2 in geoNodes:
    if (n1['nid'] == n2['nid']):
      continue
    graph.add_edge(int(n1['nid']), int(n2['nid']), distDict[n1['nid']][n2['nid']])

PathInfo = find_path(graph, 1, 4)
# print(PathInfo)
PathInfo = find_path(graph, 4, 1)
# print(PathInfo)

# large CBD: 10, 1 ；2倍吸引力
# small CBD: 12, 5 ；1倍吸引力
# 大居民区：9,3,6 18；3倍出行力 大约300人左右 random一下
# 小居民区：0,5,9,10,12,13,14,15,21,22  ；1倍出行力 大约100人左右 random一下
Os = [{'nid': '3', 'v': 300}, {'nid': '6', 'v': 300}, {'nid': '9', 'v': 300}, {'nid': '19', 'v': 600},
{'nid': '0', 'v': 100}, {'nid': '2', 'v': 100}, {'nid': '4', 'v': 100}, {'nid': '7', 'v': 100}, {'nid': '8', 'v': 100}, {'nid': '13', 'v': 100}, {'nid': '16', 'v': 100}, {'nid': '17', 'v': 100}, {'nid': '20', 'v': 100}, {'nid': '5', 'v': 100}]
Ds = [{'nid': '1', 'v': 2}, {'nid': '10', 'v': 2}, {'nid': '11', 'v': 1}, {'nid': '12', 'v': 1}]


# 一个o一张图
# for o in Os:
#   DsCopy = copy.deepcopy(Ds)
#   people = o['v'] - ((random.random() - 0.5) * 20)
#   sumCost = 0
#   g = {}
#   for d in DsCopy:
#     # print(o['nid'], d['nid'])
#     d['cost'] = find_path(graph, int(o['nid']), int(d['nid'])).total_cost / d['v']
#     sumCost += d['cost']
#   for d in DsCopy:
#     d['cost'] = d['cost'] / sumCost
#     popularity = round(people * d['cost'])
#     path = find_path(graph, int(o['nid']), int(d['nid']))
#     nodes = path.nodes

#     print(popularity, nodes)

#     for nodeI in range(0, len(nodes) - 1):
#       # print(nodes[nodeI], nodes[nodeI+1])
#       if str(nodes[nodeI]) in g:
#         if str(nodes[nodeI+1]) in g[str(nodes[nodeI])]:
#           g[str(nodes[nodeI])][str(nodes[nodeI+1])] += popularity
#         else:
#           g[str(nodes[nodeI])][str(nodes[nodeI+1])] = popularity
#       else:
#         g[str(nodes[nodeI])] = { str(nodes[nodeI+1]): popularity }

#   print(g)
#   print('\n')

# 一个o多张图
# 一个od一张图
geoNetworks = []
i = 0
for o in Os:
  DsCopy = copy.deepcopy(Ds)
  people = o['v'] - ((random.random() - 0.5) * 10)

  print(DsCopy)

  minCost = 1000000
  maxCost = 1
  for d in DsCopy:
    # print(o['nid'], d['nid'])
    d['cost'] = find_path(graph, int(o['nid']), int(d['nid'])).total_cost / d['v']
    # sumCost += d['cost']
    if maxCost < d['cost']:
      maxCost = d['cost']

  sumCost = 0
  for d in DsCopy:
    d['cost'] = maxCost / d['cost']
    sumCost += d['cost']


  for d in DsCopy:
    g = {}
    d['cost'] = d['cost'] / sumCost
    popularity = round(people * d['cost'])
    path = find_path(graph, int(o['nid']), int(d['nid']))
    nodes = path.nodes

    print(people, d['cost'],  popularity, nodes)

    for nodeI in range(0, len(nodes) - 1):
      # print(nodes[nodeI], nodes[nodeI+1])
      if str(nodes[nodeI]) in g:
        if str(nodes[nodeI+1]) in g[str(nodes[nodeI])]:
          g[str(nodes[nodeI])][str(nodes[nodeI+1])] += popularity
        else:
          g[str(nodes[nodeI])][str(nodes[nodeI+1])] = popularity
      else:
        g[str(nodes[nodeI])] = { str(nodes[nodeI+1]): popularity }

    # print(g)
    geoNetworks.append({
      'g': g,
      'id': str(i),
      'w': 1
    })
    i+=1
    print('\n')


# print(geoNetworks)

with open('frontend/public/hefei/geo-networks.json', 'w') as f:
  json.dump(geoNetworks, f, ensure_ascii=False)

# graph.add_edge(2, 3, 125)
# graph.add_edge(3, 4, 108)
# PathInfo = find_path(graph, 1, 4)
# print(PathInfo.total_cost)
# PathInfo(
#     nodes=[1, 2, 3, 4],
#     edges=[110, 125, 108],
#     costs=[110, 125, 108],
#     total_cost=343)


# with open('data/zhengzhou/geo-nodes.json', 'w') as f:
#   json.dump(geoNodes, f, ensure_ascii=False)