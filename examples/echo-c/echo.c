
#define TEXT_OUT     (*(char*)0xC0000000)

#define TEXT_IN_CTRL (*(char*)0xB0000000)
#define TEXT_IN_DATA (*(char*)0xB0000001)

#define TEXT_IN_IRQ_MASK   0x40
#define TEXT_IN_IRQ_ENABLE 0x80

__attribute__((interrupt("machine")))
void irq_handler(void) {
    TEXT_IN_CTRL &= ~TEXT_IN_IRQ_MASK;
    TEXT_OUT = TEXT_IN_DATA;
}

void main(void) {
    TEXT_IN_CTRL |= TEXT_IN_IRQ_ENABLE;
}
