const VIRTIO_NET_F_GUEST_CSUM =1
const VIRTIO_NET_F_CTRL_GUEST_OFFLOADS =2
const VIRTIO_NET_F_MAC =5
const VIRTIO_NET_F_GUEST_TSO4 =7
const VIRTIO_NET_F_GUEST_TSO6 =8
const VIRTIO_NET_F_GUEST_ECN =9
const VIRTIO_NET_F_GUEST_UFO =10
const VIRTIO_NET_F_HOST_TSO4 =11
const VIRTIO_NET_F_HOST_TSO6 =12
const VIRTIO_NET_F_HOST_ECN =13
const VIRTIO_NET_F_HOST_UFO =14
const VIRTIO_NET_F_MRG_RXBUF =15
const VIRTIO_NET_F_STATUS =16
const VIRTIO_NET_F_CTRL_VQ =17
const VIRTIO_NET_F_CTRL_RX =18
const VIRTIO_NET_F_CTRL_VLAN =19
const VIRTIO_NET_F_GUEST_ANNOUNCE=21


/**
 * @constructor
 *
 * @param {CPU} cpu
 * @param {BusConnector} bus
 */
function VirtioNet(cpu, bus) {
    /** @const @type {BusConnector} */
    this.bus = bus;
    console.log("√ in virtio net constructor");


    /** @type {VirtIO} */
    this.virtio = new VirtIO(cpu,
    {
        name: "virtio-net",
        pci_id: 0x06 << 3, // TODO: same as 9p for now
        device_id: 0x1041,
        subsystem_device_id: 1,
        common: 
        {
            initial_port: 0xA800,
            queues: 
            [
                {
                    size_supported: 32,
                    notify_offset: 0,
                },
                {
                    size_supported: 32,
                    notify_offset: 0,
                },
            ],
            features: 
            [
                VIRTIO_F_VERSION_1, 
                VIRTIO_F_RING_EVENT_IDX,
                VIRTIO_F_RING_INDIRECT_DESC,
            ], // TODO: what features are needed?
            on_driver_ok: () => {},
        },
        notification:
        {
            initial_port: 0xA900,
            single_handler: false,
            handlers:
            [
                (queue_id) =>
                {
                    console.log("√", "in handler");
                    if(queue_id !== 0)
                    {
                        dbg_assert(false, "Virtio-net Notified for non-zero queue: " + queue_id +
                            " (expected queue_id of 0)");
                        return;
                    }
                    // while(this.recv_virtqueue.has_request())
                    // {
                    //     console.log("√", "we got a a send buff");
                    //     const bufchain = this.recv_virtqueue.pop_request();
                    //     this.ReceiveRequest(bufchain);
                    // }
                    // this.recv_virtqueue.notify_me_after(0);
                    // Don't flush replies here: async replies are not completed yet.
                },
            ],
        },
        isr_status:
        {
            initial_port: 0xA700,
        },
        device_specific:
        {
            initial_port: 0xA600,
            struct:
            [
                {
                    bytes: 1,
                    name: "send",
                    read: () => console.log("√","virtionet struct send r"),
                    write: data => { console.log("√","virtionet struct send w")/* read only */ },
                },
                {
                    bytes: 1,
                    name: "receive",
                    read: () => console.log("√","virtionet struct receive r"),
                    write: data => { console.log("√","virtionet struct receive w")/* read only */ },
                }
            ],
        },
    });
    this.recv_virtqueue = this.virtio.queues[0];
    this.send_virtqueue = this.virtio.queues[1];

    console.log("√","virtionet bus register");
    this.bus.register("net0-receive", function(data)
    {
        console.log("√","virtionet bus receive");
        this.receive(data);
    }, this);
    this.bus.register("net0-send", function(data)
    {
        console.log("√","virtionet bus send");
        dump_packet(data, "receive");
    }, this);

    // var io = cpu.io;

    // cpu.io.register_read(0x300, this, function()
    // {
    //     dbg_log("Read cmd", LOG_NET);
    //     console.log("√ virtio register read");
    //     return 32;
    // });

    // cpu.io.register_write(0x300, this, function(data_byte)
    // {
    //     console.log("√","in virtionet write2");
    // });
    
}


VirtioNet.prototype.receive = function (data) {
    console.log("√","virtionet receive");
    this.bus.send("eth-receive-end", [data.length]);
}

VirtioNet.prototype.transmit = async function (bufchain) {
    console.log("√", "virtio trasmit packet");
};