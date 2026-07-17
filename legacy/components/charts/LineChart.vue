<script>
import { Line } from 'vue-chartjs'

export default {
  name: 'Chart',
  extends: Line,
  props: {
    data: { type: Object, required: true },
    height: { type: Number, default: 400 }
  },
  data () {
    return {
      options: {
        maintainAspectRatio: false,
        responsive: true,
        hover: {
          mode: 'nearest',
          intersect: true
        },
        tooltips: {
          mode: 'index',
          intersect: true
        }
      }
    }
  },
  mounted () {
    this.renderChart(this.data, this.options)
  }
}
</script>
