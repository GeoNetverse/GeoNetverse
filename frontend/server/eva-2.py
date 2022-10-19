from inspect import Parameter
from pyomo.environ import *
import numpy as np
import json
import time

# dataset = 'airvis'
# dataset = 'viscas'
# dataset = 'aircas'
# dataset = 'zhengzhou'
dataset = 'hefei'

parameters = ''
variableIndex = ''
with open('public/' + dataset + '/tmp/ilpParam-2.json', 'r') as load_f:
    parameters = json.load(load_f)

with open('public/' + dataset + '/tmp/variableIndex-2.json', 'r') as load_f2:
    variableIndex = json.load(load_f2)

leftMatrix = parameters['leftMatrix']
rightVector = parameters['rightVector']
objectives = parameters['objectives']
division = parameters['division'] # 大于等于division 用等于号
NUMBER_OF_DECISIONS = parameters['decision']

# print(leftMatrix[417])

A = np.array(leftMatrix)
b = np.array(rightVector)
c = np.array(objectives)

I = range(len(A))
J = range(len(A.T))

print(A.shape)



model = ConcreteModel()

model.x = Var(J, within=Binary)
model.constraints = ConstraintList()
for i in I:
    if (i % 200 == 0):
        print(i, I)
    if i < division:
        model.constraints.add(sum(A[i,j]*model.x[j] for j in J) >= b[i])
    else:
        model.constraints.add(sum(A[i,j]*model.x[j] for j in J) == b[i])

model.objective = Objective(expr = sum(c[j]*model.x[j] for j in J), sense=minimize)
solver = SolverFactory('glpk')

# startTime = time.asctime( time.localtime(time.time()) )
# print ("starttime :", startTime)

T1 = time.perf_counter()
solver.solve(model)
# endTime = time.asctime( time.localtime(time.time()) )
# print ("endtime :", endTime)
T2 =time.perf_counter()
print('程序运行时间:%s毫秒' % ((T2 - T1)*1000))

ret = []
for j in J:
    # print("x[", j, "] =", model.x[j].value)
    ret.append(int(model.x[j].value))

print('debug')

decisions = ret[0:NUMBER_OF_DECISIONS]
print(sum(decisions))



# with open('public/' + dataset + '/tmp/variables.json','w') as f:
#     json.dump(ret, f)