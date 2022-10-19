import json
import os
import math

# obtain all geonetworks for debug
path = 'data/airvis/origin/'
all_patterns = []
files = os.listdir(path)
for file_name in files:
  if file_name[0] != 'r':
    continue
  file_full_name = path + file_name

  with open(file_full_name, 'r') as load_f:
    patterns = json.load(load_f)
    for p in patterns:
      all_patterns.append({
        'id': p['id'],
        'g': p['g'],
        'w': len(p['supportings'])
      })

with open('data/airvis/all-geo-networks.json', 'w') as f:
  json.dump(all_patterns, f, ensure_ascii=False)



# parameters
sup_thred = 220


path = 'data/airvis/origin/'
patterns_valid = []
patterns_valid_super = []
children_ids_dict = {}

files = os.listdir(path)
for file_name in files:
  if file_name[0] != 'r':
    continue
  file_full_name = path + file_name

  print(file_full_name)

  with open(file_full_name, 'r') as load_f:
    patterns = json.load(load_f)
    for p in patterns:
      sup = len(p['supportings'])
      if sup > sup_thred:
        patterns_valid.append(p)
        children_ids = p['children']
        for id in children_ids:
          children_ids_dict[id] = 1

for p in patterns_valid:
  id = p['id']
  if id not in children_ids_dict:
    patterns_valid_super.append(p)

geo_networks = []
for p in patterns_valid_super:
  if (p['id'] == '1_77'):
    continue
  geo_networks.append({
    'id': p['id'],
    'g': p['g'],
    'w': round(math.pow(len(p['supportings']), 0.85))
    # 'w': len(p['supportings'])
  })

with open('data/airvis/geo-networks.json', 'w') as f:
  json.dump(geo_networks, f)


# parse locations
nodes = []
with open('data/airvis/origin/district_valid.json', 'r') as load_f:
  locations = json.load(load_f)
  for l in locations:
    nodes.append({
      'nid': str(l['sid']),
      'lat': l['lat'],
      'lng': l['lng'],
      'namechn': l['namechn'],
      'nameeng': l['nameeng']
    })

with open('data/airvis/geo-nodes.json', 'w') as f:
  json.dump(nodes, f, ensure_ascii=False)





