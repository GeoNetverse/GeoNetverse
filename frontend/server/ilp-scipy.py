import pulp
import numpy as np
import json
import time
from sys import getsizeof

print(pulp.listSolvers(onlyAvailable = True))

with open('server/datasetName.json', 'r') as load_f:
    param = json.load(load_f)
dataset = param['name']

parameters = ''
with open('public/' + dataset + '/tmp/ilpParam.json', 'r') as load_f:
    parameters = json.load(load_f)

leftMatrix = parameters['leftMatrix']
rightVector = parameters['rightVector']
objectives = parameters['objectives']
division = parameters['division'] # 大于等于division 用等于号

# print(leftMatrix[417])

# print(objectives[0:20])
# print(division)

T1 = time.perf_counter()


A = np.array(leftMatrix)
b = np.array(rightVector)
c = np.array(objectives)

I = range(len(A)) # 约束的个数
J = range(len(A.T)) # 变量的个数


print(I,J)
print(getsizeof(A))

T2 =time.perf_counter()
print('程序运行时间:%s毫秒' % ((T2 - T1)*1000))

# model = ConcreteModel()

# model.x = Var(J, within=Binary)
# model.constraints = ConstraintList()
# for i in I:
#     if (i % 100 == 0):
#         print(I, i)
#     if i < division:
#         model.constraints.add(sum(A[i,j]*model.x[j] for j in J) >= b[i])
#     else:
#         model.constraints.add(sum(A[i,j]*model.x[j] for j in J) == b[i])

# model.objective = Objective(expr = sum(c[j]*model.x[j] for j in J), sense=minimize)
# solver = SolverFactory('glpk')
# solver.solve(model)



model = pulp.LpProblem("Cost minimising problem", pulp.LpMinimize)
Vars = pulp.LpVariable.dicts("var",
                            (varIndex for varIndex in J),
                            cat='Binary')
model += (
pulp.lpSum([c[j]*Vars[j] for j in J])
)

for i in I:
  if i < division:
    model += pulp.lpSum([A[i][j]*Vars[j] for j in J]) >= b[i]
  else:
    model += pulp.lpSum([A[i][j]*Vars[j] for j in J]) == b[i]
solver = pulp.getSolver('PULP_CBC_CMD')
T3 =time.perf_counter()
print('程序运行时间:%s毫秒' % ((T3 - T2)*1000))
model.solve(solver)
# pulp.LpStatus[model.status]
ret = [int(Vars[j].varValue) for j in J]

costSum = [c[j]*ret[j] for j in J]
print(sum(costSum))


# ret = []
# for j in J:
#     # print("x[", j, "] =", model.x[j].value)
#     ret.append(int(model.x[j].value))


T4 =time.perf_counter()
print('程序运行时间:%s毫秒' % ((T4 - T3)*1000))

print(getsizeof(model))

with open('public/' + dataset + '/tmp/variables.json','w') as f:
    json.dump(ret, f)





# costs = [2, -1]
# param = [[9, -3], [1, 2], [2, -1]]
# b = [11, 10, 7]
# division = 1
# nVar = 2
# nCons = 3

# model = pulp.LpProblem("Cost minimising problem", pulp.LpMinimize)
# Mcj = pulp.LpVariable.dicts("var",
#                             (i for i in range(2)),
#                             lowBound=0,
#                             upBound=100,
#                             cat='Integer')

# # Objective Function
# model += (
# pulp.lpSum([costs[i]*Mcj[i] for i in range(nVar)])
# )


# # Constraints
# for i in range(len(param)):
#   if i < division:
#     model += pulp.lpSum([param[i][j]*Mcj[j] for j in range(nVar)]) >= b[i]
#   else:
#     model += pulp.lpSum([param[i][j]*Mcj[j] for j in range(nVar)]) <= b[i]


# # Solve our problem
# model.solve()
# pulp.LpStatus[model.status]
# Output = [Mcj[j].varValue for j in range(nVar)]

# # print(Output)