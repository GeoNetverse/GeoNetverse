from inspect import Parameter
from pyomo.environ import *
import numpy as np
import json
import time


dataset = 'airvis'
# dataset = 'viscas'
# dataset = 'aircas'
# dataset = 'nyc'
# dataset = 'zhengzhou'
# dataset = 'hefei'

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

I = range(len(A))
J = range(len(A.T))

print(I, J)


T2 =time.perf_counter()
print('程序运行时间:%s毫秒' % ((T2 - T1)*1000))


model = ConcreteModel()

model.x = Var(J, within=Binary)
model.constraints = ConstraintList()
for i in I:
    if (i % 100 == 0):
        print(I, i)
    if i < division:
        model.constraints.add(sum(A[i,j]*model.x[j] for j in J) >= b[i])
    else:
        model.constraints.add(sum(A[i,j]*model.x[j] for j in J) == b[i])

model.objective = Objective(expr = sum(c[j]*model.x[j] for j in J), sense=minimize)
solver = SolverFactory('glpk')
T3 =time.perf_counter()
print('程序运行时间:%s毫秒' % ((T3 - T2)*1000))
solver.solve(model)

ret = []
for j in J:
    # print("x[", j, "] =", model.x[j].value)
    ret.append(int(model.x[j].value))

costSum = sum([c[j]*ret[j] for j in J])
print(costSum)

T4 =time.perf_counter()
print('程序运行时间:%s毫秒' % ((T4 - T3)*1000))

print('debug')

# with open('public/' + dataset + '/tmp/variables.json','w') as f:
#     json.dump(ret, f)





# enter data as numpy arrays
# A = np.array([[1, 0], [1, 1], [2,1]]) # 三行两列，三个约束，两个变量
# b = np.array([40, 80,100])
# c = np.array([40,30])

# # set of row indices
# I = range(len(A)) # 三个约束

# # set of column indices
# J = range(len(A.T)) # 两个变量

# print(I, J)

# # create a model instance
# model = ConcreteModel()

# # create x and y variables in the model
# model.x = Var(J, within=Binary)

# # add model constraints
# model.constraints = ConstraintList()
# for i in I:
#     model.constraints.add(sum(A[i,j]*model.x[j] for j in J) <= b[i])

# # add a model objective
# model.objective = Objective(expr = sum(c[j]*model.x[j] for j in J), sense=maximize)

# # create a solver
# solver = SolverFactory('glpk')

# # solve
# solver.solve(model)

# # print solutions
# for j in J:
#     print("x[", j, "] =", model.x[j].value)

# model.constraints.display()