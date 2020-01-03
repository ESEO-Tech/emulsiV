
lui x1, 0x00000
lui x2, 0xfffff

auipc x3, 0x00000
auipc x4, 0xfffff

L0:
jal x5, L0
jal x6, L0

jalr x7, x0, 0
jalr x8, x1, -4

L1:
beq  x2, x1, L1
bne  x3, x2, L1
blt  x4, x3, L1
bge  x5, x4, L1
bltu x6, x5, L1
bgeu x7, x6, L1

lb x9, 0(x7)
lh x10, 2(x8)
lw x11, 4(x9)
lbu x12, -1(x10)
lhu x13, -2(x11)

sb x7, -4(x12)
sh x8, -6(x13)
sw x9, -8(x14)

addi x14, x15, 0
addi x15, x0, -1
slli x1, x2, 0
slli x2, x3, 31
slti x3, x4, 1
sltiu x4, x5, -2
xori x5, x6, 2
srli x6, x7, 0
srli x7, x8, 31
srai x8, x9, 0
srai x9, x10, 31
ori x10, x11, -3
andi x11, x12, 3

add x12, x13, x0
sub x13, x14, x1
sll x14, x15, x2
slt x15, x0, x3
sltu x0, x1, x4
xor x1, x2, x5
srl x2, x3, x6
sra x3, x4, x7
or x4, x5, x8
and x5, x6, x9
